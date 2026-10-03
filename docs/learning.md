# Aprender y consultar

**Aprender** abre fichas locales en español. **Consultar** busca la palabra bajo el cursor; la paleta ofrece la misma acción. Busca por nombre o intención (`sumar`, `recorrer`, `reduce`). Filtra por lenguaje o Todos. TypeScript incluye fichas JavaScript.

Las explicaciones y ejemplos son originales. MDN es una referencia comunitaria de JavaScript, no la especificación oficial ECMAScript. TypeScript y Python enlazan documentación oficial. Las fichas funcionan offline; abrir referencias requiere conexión y una acción explícita. El IPC solo admite IDs de enlaces del catálogo, no URLs arbitrarias.

**Abrir ejemplo en una pestaña** conserva tu código y desactiva Auto Run. Pulsa Run para probarlo. Copiar copia solo el ejemplo.

La consulta contextual es léxica, no identifica tipos ni métodos de bibliotecas. Comprueba que la ficha corresponde a tu caso. Hay diez fichas iniciales, no documentación completa. No usa IA ni descarga contenido silenciosamente.

## Añadir fichas

Edita `src/learning/catalog.ts`: id único, lenguaje, título, explicación, palabras clave, código original, consejo, URL HTTPS y atribución. Evita copiar tutoriales. Indica versiones y comprueba ejemplos en su motor. Los tests recorren ejemplos Python y JS/TS; mantenlos deterministas y sin paquetes, red ni archivos del usuario.

Referencias: [AST Python](https://docs.python.org/3/library/ast.html), [control de flujo](https://docs.python.org/3/tutorial/controlflow.html), [estructuras de datos](https://docs.python.org/3/tutorial/datastructures.html), [MDN reduce](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce), [MDN forEach](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach).
