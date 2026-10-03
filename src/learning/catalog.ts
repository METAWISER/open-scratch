import type { Tab } from "../shared/contracts";
export interface Lesson {
  id: string;
  language: "js" | "ts" | "py" | "cs";
  title: string;
  summary: string;
  keywords: string[];
  code: string;
  tip: string;
  reference: string;
  source: string;
  es: { title: string; summary: string; tip: string; source: string };
}
export const lessons: Lesson[] = [
  {
    id: "js-reduce",
    language: "js",
    title: "Array.reduce()",
    summary: "Accumulate array elements into a single result.",
    keywords: [
      "sumar",
      "total",
      "acumulador",
      "reduce",
      "sum",
      "total",
      "accumulator",
      "reduce",
    ],
    code: "const prices = [10, 20, 30];\nconst total = prices.reduce((sum, price) => sum + price, 0);\ntotal; // 60",
    tip: "Provide an initial value so empty arrays are supported.",
    reference:
      "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce",
    source: "MDN · JavaScript reference",
    es: {
      title: "Array.reduce()",
      summary: "Acumula los elementos de un array en un resultado.",
      tip: "Proporciona un valor inicial: permite procesar también un array vacío.",
      source: "MDN · referencia de JavaScript",
    },
  },
  {
    id: "js-forEach",
    language: "js",
    title: "Array.forEach()",
    summary: "Call a function for each present array element.",
    keywords: [
      "recorrer",
      "bucle",
      "iterar",
      "forEach",
      "iterate",
      "loop",
      "forEach",
    ],
    code: "const names = ['Ada', 'Linus'];\nnames.forEach((name, index) => console.log(index, name));",
    tip: "Returns undefined and does not await async callbacks. Use for…of with await for sequential work.",
    reference:
      "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach",
    source: "MDN · JavaScript reference",
    es: {
      title: "Array.forEach()",
      summary: "Ejecuta una función para cada elemento presente del array.",
      tip: "Devuelve undefined. No espera callbacks async; usa for…of y await para esperar cada operación.",
      source: "MDN · referencia de JavaScript",
    },
  },
  {
    id: "js-map",
    language: "js",
    title: "Array.map()",
    summary: "Create a new array by transforming each element.",
    keywords: [
      "transformar",
      "convertir",
      "map",
      "duplicar",
      "transform",
      "convert",
      "map",
    ],
    code: "const numbers = [1, 2, 3];\nconst doubled = numbers.map(number => number * 2);\ndoubled; // [2, 4, 6]",
    tip: "Return the transformed value from the callback. Use forEach for side effects.",
    reference:
      "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map",
    source: "MDN · JavaScript reference",
    es: {
      title: "Array.map()",
      summary:
        "Crea un nuevo array con los resultados de transformar sus elementos.",
      tip: "Devuelve el resultado desde el callback. No uses map solo para producir efectos secundarios.",
      source: "MDN · referencia de JavaScript",
    },
  },
  {
    id: "js-filter",
    language: "js",
    title: "Array.filter()",
    summary: "Keep the elements that match a condition.",
    keywords: ["filtrar", "seleccionar", "filter", "filter", "select"],
    code: "const ages = [12, 18, 25];\nconst adults = ages.filter(age => age >= 18);\nadults; // [18, 25]",
    tip: "The new array shares object references; it is not a deep copy.",
    reference:
      "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter",
    source: "MDN · JavaScript reference",
    es: {
      title: "Array.filter()",
      summary:
        "Construye un array con los elementos que cumplen una condición.",
      tip: "El array nuevo conserva las referencias de sus objetos; no realiza una copia profunda.",
      source: "MDN · referencia de JavaScript",
    },
  },
  {
    id: "js-find",
    language: "js",
    title: "Array.find()",
    summary: "Find the first element matching a condition.",
    keywords: ["buscar", "encontrar", "find", "search", "find"],
    code: "const users = [{ id: 1, name: 'Ada' }, { id: 2, name: 'Grace' }];\nusers.find(user => user.id === 2);",
    tip: "Returns undefined if no element matches.",
    reference:
      "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find",
    source: "MDN · JavaScript reference",
    es: {
      title: "Array.find()",
      summary: "Encuentra el primer elemento que cumple una condición.",
      tip: "Devuelve undefined cuando ningún elemento coincide.",
      source: "MDN · referencia de JavaScript",
    },
  },
  {
    id: "ts-generics",
    language: "ts",
    title: "TypeScript generics",
    summary: "Relate input and output types without losing information.",
    keywords: [
      "genericos",
      "generics",
      "tipos",
      "interface",
      "generics",
      "types",
      "interface",
    ],
    code: "interface Box<T> { value: T }\nfunction wrap<T>(value: T): Box<T> { return { value }; }\nwrap('Hello').value.toUpperCase();",
    tip: "Types are checked in the editor and removed before execution.",
    reference: "https://www.typescriptlang.org/docs/handbook/2/generics.html",
    source: "TypeScript · official documentation",
    es: {
      title: "Genéricos en TypeScript",
      summary: "Relaciona tipos de entrada y salida sin perder información.",
      tip: "Los tipos se comprueban en el editor y se eliminan antes de ejecutar.",
      source: "TypeScript · documentación oficial",
    },
  },
  {
    id: "py-for",
    language: "py",
    title: "for and enumerate()",
    summary: "Iterate a collection with the index of each element.",
    keywords: [
      "recorrer",
      "bucle",
      "forEach",
      "enumerate",
      "for",
      "iterate",
      "loop",
      "enumerate",
      "foreach",
    ],
    code: "names = ['Ada', 'Linus']\nfor index, name in enumerate(names):\n    print(index, name)",
    tip: "Indentation defines the loop body. Python does not have Array.forEach.",
    reference:
      "https://docs.python.org/3/tutorial/controlflow.html#for-statements",
    source: "Python 3 · official documentation",
    es: {
      title: "for y enumerate()",
      summary: "Recorre una colección y obtiene el índice de cada elemento.",
      tip: "La indentación delimita el cuerpo del bucle. Python no tiene Array.forEach.",
      source: "Python 3 · documentación oficial",
    },
  },
  {
    id: "py-sum",
    language: "py",
    title: "sum()",
    summary: "Add the values of an iterable.",
    keywords: ["sumar", "total", "reduce", "sum", "sum", "total", "reduce"],
    code: "prices = [10, 20, 30]\ntotal = sum(prices)\ntotal  # 60",
    tip: "For numeric sums, sum is simpler than functools.reduce.",
    reference: "https://docs.python.org/3/library/functions.html#sum",
    source: "Python 3 · official documentation",
    es: {
      title: "sum()",
      summary: "Suma los valores de un iterable.",
      tip: "Para sumar números, sum resulta más directo que functools.reduce.",
      source: "Python 3 · documentación oficial",
    },
  },
  {
    id: "py-comprehension",
    language: "py",
    title: "List comprehensions",
    summary: "Combine filtering and transformation to build a list.",
    keywords: [
      "map",
      "filter",
      "transformar",
      "filtrar",
      "listas",
      "list",
      "map",
      "filter",
      "transform",
    ],
    code: "numbers = [1, 2, 3, 4]\ndoubled_even = [n * 2 for n in numbers if n % 2 == 0]\ndoubled_even  # [4, 8]",
    tip: "Use an explicit loop when the comprehension becomes hard to read.",
    reference:
      "https://docs.python.org/3/tutorial/datastructures.html#list-comprehensions",
    source: "Python 3 · official documentation",
    es: {
      title: "Comprensiones de listas",
      summary: "Combina transformación y filtrado al crear una lista.",
      tip: "Usa un bucle explícito si la comprensión se vuelve difícil de leer.",
      source: "Python 3 · documentación oficial",
    },
  },
  {
    id: "py-dict",
    language: "py",
    title: "Dictionaries",
    summary: "Associate keys with values and look up an optional key.",
    keywords: [
      "dict",
      "diccionario",
      "objeto",
      "get",
      "claves",
      "dictionary",
      "dict",
      "object",
      "keys",
      "get",
    ],
    code: "person = {'name': 'Ada', 'language': 'Python'}\nperson.get('name')\nperson.get('age', 'Not provided')",
    tip: "get accepts a default value. Indexing with [] raises KeyError for a missing key.",
    reference:
      "https://docs.python.org/3/tutorial/datastructures.html#dictionaries",
    source: "Python 3 · official documentation",
    es: {
      title: "Diccionarios",
      summary: "Asocia claves con valores y consulta una clave opcional.",
      tip: "get permite un valor predeterminado; acceder con [] produce KeyError si falta la clave.",
      source: "Python 3 · documentación oficial",
    },
  },
  {
    id: "cs-foreach",
    language: "cs",
    title: "foreach",
    summary: "Visit each element of a collection.",
    keywords: ["foreach", "loop", "iterate", "recorrer", "bucle"],
    code: 'string[] names = ["Ada", "Grace"];\nforeach (var name in names)\n{\n    Console.WriteLine(name);\n}',
    tip: "Use Console.WriteLine for C# output. Auto Log is not available for this runtime.",
    source: "Microsoft Learn · official documentation",
    reference:
      "https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/statements/iteration-statements#the-foreach-statement",
    es: {
      title: "foreach",
      summary: "Recorre cada elemento de una colección.",
      tip: "Usa Console.WriteLine para la salida de C#. Este motor no tiene Auto Log.",
      source: "Microsoft Learn · documentación oficial",
    },
  },
  {
    id: "cs-linq",
    language: "cs",
    title: "LINQ: Where, Select and Sum",
    summary: "Filter, transform and sum a sequence.",
    keywords: ["linq", "filter", "map", "sum", "sumar", "filtrar", "reduce"],
    code: "int[] numbers = [1, 2, 3, 4];\nvar total = numbers.Where(n => n % 2 == 0).Select(n => n * 2).Sum();\nConsole.WriteLine(total); // 12",
    tip: "System.Linq is included by the generated project. No NuGet package is required.",
    source: "Microsoft Learn · official documentation",
    reference: "https://learn.microsoft.com/en-us/dotnet/csharp/linq/",
    es: {
      title: "LINQ: Where, Select y Sum",
      summary: "Filtra, transforma y suma una secuencia.",
      tip: "El proyecto generado incluye System.Linq. No requiere paquetes NuGet.",
      source: "Microsoft Learn · documentación oficial",
    },
  },
  {
    id: "cs-await",
    language: "cs",
    title: "Top-level await",
    summary: "Wait for asynchronous work in a C# program.",
    keywords: ["async", "await", "task", "asincrono", "esperar"],
    code: 'await Task.Delay(50);\nConsole.WriteLine("Async work completed");',
    tip: "The .NET SDK compiles top-level statements into an entry point.",
    source: "Microsoft Learn · official documentation",
    reference:
      "https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/program-structure/top-level-statements",
    es: {
      title: "await en el nivel superior",
      summary: "Espera trabajo asíncrono en un programa C#.",
      tip: "El SDK de .NET compila las instrucciones superiores como punto de entrada.",
      source: "Microsoft Learn · documentación oficial",
    },
  },
];

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export function searchLessons(
  query: string,
  language: Tab["language"] | "all",
  locale: "en" | "es" = "en",
) {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  return lessons
    .filter(
      (lesson) =>
        (language === "all" ||
          lesson.language ===
            (language === "jsx"
              ? "js"
              : language === "tsx"
                ? "ts"
                : language) ||
          ((language === "ts" || language === "tsx") &&
            lesson.language === "js")) &&
        terms.every((term) =>
          normalize(
            [
              lesson.title,
              lesson.summary,
              lesson.es.title,
              lesson.es.summary,
              ...lesson.keywords,
            ].join(" "),
          ).includes(term),
        ),
    )
    .map((lesson) => (locale === "es" ? { ...lesson, ...lesson.es } : lesson));
}
export function referenceFor(id: string) {
  if (id === "contribute")
    return "https://github.com/METAWISER/open-scratch/blob/main/CONTRIBUTING.md";
  if (id === "docs") return "https://metawiser.github.io/open-scratch/";
  return lessons.find((lesson) => lesson.id === id)?.reference;
}
