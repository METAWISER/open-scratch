import type { Tab } from "../shared/contracts";
export interface Lesson {
  id: string;
  language: "js" | "ts" | "py";
  title: string;
  summary: string;
  keywords: string[];
  code: string;
  tip: string;
  reference: string;
  source: string;
}
const array =
  "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/";
export const lessons: Lesson[] = [
  {
    id: "js-reduce",
    language: "js",
    title: "Array.reduce()",
    summary: "Acumula los elementos de un array en un resultado.",
    keywords: ["sumar", "total", "acumulador", "reduce"],
    code: "const precios = [10, 20, 30];\nconst total = precios.reduce((acumulado, precio) => acumulado + precio, 0);\ntotal; // 60",
    tip: "Proporciona un valor inicial: permite procesar también un array vacío.",
    reference: array + "reduce",
    source: "MDN · referencia de JavaScript",
  },
  {
    id: "js-forEach",
    language: "js",
    title: "Array.forEach()",
    summary: "Ejecuta una función para cada elemento presente del array.",
    keywords: ["recorrer", "bucle", "iterar", "forEach"],
    code: "const nombres = ['Ada', 'Linus'];\nnombres.forEach((nombre, indice) => {\n  console.log(indice, nombre);\n});",
    tip: "Devuelve undefined. No espera callbacks async; usa for…of y await para esperar cada operación.",
    reference: array + "forEach",
    source: "MDN · referencia de JavaScript",
  },
  {
    id: "js-map",
    language: "js",
    title: "Array.map()",
    summary:
      "Crea un nuevo array con los resultados de transformar sus elementos.",
    keywords: ["transformar", "convertir", "map", "duplicar"],
    code: "const numeros = [1, 2, 3];\nconst dobles = numeros.map(numero => numero * 2);\ndobles; // [2, 4, 6]",
    tip: "Devuelve el resultado desde el callback. No uses map solo para producir efectos secundarios.",
    reference: array + "map",
    source: "MDN · referencia de JavaScript",
  },
  {
    id: "js-filter",
    language: "js",
    title: "Array.filter()",
    summary: "Construye un array con los elementos que cumplen una condición.",
    keywords: ["filtrar", "seleccionar", "filter"],
    code: "const edades = [12, 18, 25];\nconst adultos = edades.filter(edad => edad >= 18);\nadultos; // [18, 25]",
    tip: "El array nuevo conserva las referencias de sus objetos; no realiza una copia profunda.",
    reference: array + "filter",
    source: "MDN · referencia de JavaScript",
  },
  {
    id: "js-find",
    language: "js",
    title: "Array.find()",
    summary: "Encuentra el primer elemento que cumple una condición.",
    keywords: ["buscar", "encontrar", "find"],
    code: "const usuarios = [{ id: 1, nombre: 'Ada' }, { id: 2, nombre: 'Grace' }];\nusuarios.find(usuario => usuario.id === 2);",
    tip: "Devuelve undefined cuando ningún elemento coincide.",
    reference: array + "find",
    source: "MDN · referencia de JavaScript",
  },
  {
    id: "ts-generics",
    language: "ts",
    title: "Genéricos en TypeScript",
    summary: "Relaciona tipos de entrada y salida sin perder información.",
    keywords: ["genericos", "generics", "tipos", "interface"],
    code: "interface Caja<T> { valor: T }\nfunction envolver<T>(valor: T): Caja<T> { return { valor }; }\nconst caja = envolver('Hola');\ncaja.valor.toUpperCase();",
    tip: "Los tipos se comprueban en el editor y se eliminan antes de ejecutar.",
    reference: "https://www.typescriptlang.org/docs/handbook/2/generics.html",
    source: "TypeScript · documentación oficial",
  },
  {
    id: "py-for",
    language: "py",
    title: "for y enumerate()",
    summary: "Recorre una colección y obtiene el índice de cada elemento.",
    keywords: ["recorrer", "bucle", "forEach", "enumerate", "for"],
    code: "nombres = ['Ada', 'Linus']\nfor indice, nombre in enumerate(nombres):\n    print(indice, nombre)",
    tip: "La indentación delimita el cuerpo del bucle. Python no tiene Array.forEach.",
    reference:
      "https://docs.python.org/3/tutorial/controlflow.html#for-statements",
    source: "Python 3 · documentación oficial",
  },
  {
    id: "py-sum",
    language: "py",
    title: "sum()",
    summary: "Suma los valores de un iterable.",
    keywords: ["sumar", "total", "reduce", "sum"],
    code: "precios = [10, 20, 30]\ntotal = sum(precios)\ntotal  # 60",
    tip: "Para sumar números, sum resulta más directo que functools.reduce.",
    reference: "https://docs.python.org/3/library/functions.html#sum",
    source: "Python 3 · documentación oficial",
  },
  {
    id: "py-comprehension",
    language: "py",
    title: "Comprensiones de listas",
    summary: "Combina transformación y filtrado al crear una lista.",
    keywords: ["map", "filter", "transformar", "filtrar", "listas"],
    code: "numeros = [1, 2, 3, 4]\ndobles_pares = [n * 2 for n in numeros if n % 2 == 0]\ndobles_pares  # [4, 8]",
    tip: "Usa un bucle explícito si la comprensión se vuelve difícil de leer.",
    reference:
      "https://docs.python.org/3/tutorial/datastructures.html#list-comprehensions",
    source: "Python 3 · documentación oficial",
  },
  {
    id: "py-dict",
    language: "py",
    title: "Diccionarios",
    summary: "Asocia claves con valores y consulta una clave opcional.",
    keywords: ["dict", "diccionario", "objeto", "get", "claves"],
    code: "persona = {'nombre': 'Ada', 'lenguaje': 'Python'}\npersona.get('nombre')\npersona.get('edad', 'No indicada')",
    tip: "get permite un valor predeterminado; acceder con [] produce KeyError si falta la clave.",
    reference:
      "https://docs.python.org/3/tutorial/datastructures.html#dictionaries",
    source: "Python 3 · documentación oficial",
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
) {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  return lessons.filter(
    (lesson) =>
      (language === "all" ||
        lesson.language ===
          (language === "jsx" ? "js" : language === "tsx" ? "ts" : language) ||
        ((language === "ts" || language === "tsx") &&
          lesson.language === "js")) &&
      terms.every((term) =>
        normalize(
          [lesson.title, lesson.summary, ...lesson.keywords].join(" "),
        ).includes(term),
      ),
  );
}
export function referenceFor(id: string) {
  if (id === "contribute")
    return "https://github.com/METAWISER/open-scratch/blob/main/CONTRIBUTING.md";
  return lessons.find((lesson) => lesson.id === id)?.reference;
}
