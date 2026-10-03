/** Sent over stdin, never interpolated into a shell command. Python 3.10+. */
export const pythonWorker = String.raw`
import ast, asyncio, inspect, json, sys, traceback, linecache, uuid, itertools
request = json.loads(sys.stdin.read())
source = request['tab']['code']
filename = 'scratch.py'
linecache.cache[filename] = (len(source), None, source.splitlines(True), filename)
transport = sys.stdout
count = 0
def send(level, values, line=None):
    global count
    count += 1
    limit = request['limits']['output']
    if count > limit + 1: return
    if count == limit + 1:
        values = [{'type':'truncated','preview':'Output limit reached','truncated':True}]
        level = 'warn'
    event = {'kind':'output','runId':request['runId'],'level':level,'values':values}
    if line: event['line'] = line
    data = json.dumps(event, ensure_ascii=True)
    if len(data) > 180000:
        event['values'] = [{'type':'truncated','preview':'Snapshot too large','truncated':True}]
    transport.write(json.dumps(event, ensure_ascii=True) + '\n')
    transport.flush()
def snapshot(value, depth=0, seen=None, budget=None):
    if seen is None: seen = {}
    if budget is None: budget = [2000]
    budget[0] -= 1
    if budget[0] < 0: return {'type':'truncated','preview':'Snapshot limit','truncated':True}
    t = type(value)
    if t in (str, int, float, bool, bytes, type(None)):
        if t is int and value.bit_length() > 16000: return {'type':'int','preview':'Large integer','truncated':True}
        text = repr(value[:8000] if t in (str, bytes) else value)
        return {'type':t.__name__, 'preview':text[:8000], 'truncated':len(text)>8000}
    if t not in (list, tuple, dict, set, frozenset):
        # Do not call arbitrary __repr__, properties or overridden iterators.
        return {'type':'object','preview':'<Python object; custom inspection disabled>'}
    ident = id(value)
    if ident in seen: return {'type':'reference','preview':'Circular/reference #' + str(seen[ident])}
    seen[ident] = len(seen) + 1
    out = {'type':t.__name__, 'preview':t.__name__ + '(' + str(len(value)) + ')', 'id':seen[ident]}
    if depth >= request['limits']['depth']:
        out['truncated'] = True
        return out
    entries = value.items() if t is dict else enumerate(value)
    out['entries'] = []
    limit = request['limits']['entries']
    for key, item in itertools.islice(entries, limit):
        label = repr(key)[:200] if type(key) in (str, int, float, bool) else '<key>'
        out['entries'].append([label, snapshot(item, depth+1, seen, budget)])
    if len(value) > limit: out['truncated'] = True
    return out
def log(value, line):
    if value is not None: send('result', [snapshot(value)], line)
    return value
class Output:
    encoding = 'utf-8'
    def __init__(self, level): self.level = level
    def write(self, text):
        if text and text != '\n':
            frame = sys._getframe(1)
            while frame and frame.f_code.co_filename != filename: frame = frame.f_back
            send(self.level, [{'type':'string','preview':text[:8000], 'truncated':len(text)>8000}], frame.f_lineno if frame else None)
        return len(text)
    def flush(self): pass
    def isatty(self): return False
sys.stdout = Output('log')
sys.stderr = Output('error')
try:
    tree = ast.parse(source, filename)
    hook = '__openscratch_' + uuid.uuid4().hex
    if request['autoLog']:
        for i, node in enumerate(tree.body):
            if isinstance(node, ast.Expr) and not (i == 0 and isinstance(node.value, ast.Constant) and isinstance(node.value.value, str)):
                node.value = ast.copy_location(ast.Call(func=ast.Name(id=hook, ctx=ast.Load()), args=[node.value, ast.Constant(node.lineno)], keywords=[]), node.value)
    ast.fix_missing_locations(tree)
    namespace = {'__name__':'__main__','__file__':filename, hook:log}
    code = compile(tree, filename, 'exec', flags=ast.PyCF_ALLOW_TOP_LEVEL_AWAIT)
    result = eval(code, namespace)
    if inspect.iscoroutine(result): asyncio.run(result)
except BaseException as error:
    frames = traceback.extract_tb(error.__traceback__)
    lines = [f.lineno for f in frames if f.filename == filename]
    line = error.lineno if isinstance(error, SyntaxError) else (lines[-1] if lines else None)
    send('error', [{'type':'Error','preview':''.join(traceback.format_exception(type(error), error, error.__traceback__))[-16000:]}], line)
    sys.exit(1)
`;
