# Motores de lenguaje

OpenScratch 0.2 añade Python a JavaScript/TypeScript/JSX/TSX. Go, Rust y C# no están implementados ni aparecen como opciones.

Selecciona PY en Language. Runtime cambia a Python. Instala Python 3.10+ por separado: Windows utiliza `py -3`; macOS/Linux, `python3`. En Tab settings puedes indicar la ruta a un ejecutable, incluido el de un virtualenv (`.venv/Scripts/python.exe` o `.venv/bin/python`). No incluyas argumentos ni comillas alrededor de la ruta. Usa el directorio y las variables explícitas de la pestaña. Si falta el intérprete aparece un error con instrucciones. No se descarga automáticamente.

Importa desde el directorio de trabajo y las dependencias del intérprete. npm solo gestiona JS/TS; prepara entornos pip fuera de OpenScratch.

Python usa un proceso dedicado, spawn sin shell, entorno heredado restringido, UTF-8, runId y generaciones contra resultados obsoletos. Stop termina el árbol de procesos como en Node. Se aplican timeout y límites de inspección/salida (4 MB de transporte). El límite de heap Node no se aplica: no hay límite de memoria Python. No es un sandbox.

Auto Log instrumenta expresiones superiores con `ast`, conserva líneas y docstrings y evalúa cada expresión una vez. Omite resultados None. Top-level await usa `PyCF_ALLOW_TOP_LEVEL_AWAIT` y asyncio; las tareas pendientes se cancelan al finalizar ese event loop. Cada Run crea un namespace nuevo. stdin entrega el snippet: `input()` interactivo no está soportado.

Captura print, stdout/stderr y excepciones con líneas de scratch.py. print puede generar entradas separadas. El inspector expande contenedores builtin exactos, detecta ciclos y limita volumen. No llama a repr personalizado ni propiedades: las instancias personalizadas aparecen opacas. La salida nativa puede no tener línea. No protege contra código que manipule deliberadamente el protocolo.

Monaco ofrece resaltado y edición Python. No hay servidor de lenguaje, análisis de tipos, formateador, logpoints ni magic comments Python. La barra de estado y los controles indican estas diferencias. JS/TS conserva sus capacidades.

## Otro motor

Implementa `src/runtime/engine.ts` (`ExecutionEngine.run/stop`) y compón el motor en main. Extiende esquemas, selección del editor e importación/exportación. Ejecuta en un proceso cancelable con argumentos estructurados, RunEvent validado y límites. Prueba sustitución, salida masiva, errores y Stop con un bucle activo. Declara capacidades e instalación, sin anunciar equivalencia entre lenguajes.

Los contratos IA aceptan el lenguaje sin depender del motor. El estado v1 añade pythonExecutable vacío por defecto para cargar instalaciones anteriores. Workspaces de 0.2 con Python no son compatibles con 0.1.
