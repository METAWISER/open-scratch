# Contribuir a OpenScratch

Puedes contribuir con código, pruebas, documentación, traducciones, accesibilidad, ejemplos o informes de errores. No necesitas acceso de escritura: usa un fork y un pull request.

## Primeros pasos

1. Busca un [issue existente](https://github.com/METAWISER/open-scratch/issues) o abre uno con las plantillas. Para cambios grandes, describe primero el problema y el alcance.
2. Haz un fork de [METAWISER/open-scratch](https://github.com/METAWISER/open-scratch) y clónalo.
3. Instala Node 24, pnpm 11.19 y Python 3.10+ (necesario para las pruebas de Python). Ejecuta `pnpm install --frozen-lockfile`.
4. Crea una rama: `git switch -c feat/mi-mejora`. Ejecuta `pnpm dev` y añade pruebas del comportamiento.
5. Ejecuta `pnpm check` y `pnpm test:e2e`. Electron necesita sesión gráfica; Linux CI utiliza Xvfb.
6. Sube la rama a tu fork y abre un pull request contra `main`, explicando qué cambia y cómo lo verificaste. No necesitas invitación como colaborador.

## Primeras contribuciones

- Añadir una ficha original a `src/learning/catalog.ts`, con ejemplo comprobado, versión y referencia. Consulta [el formato](docs/learning.md).
- Mejorar textos, accesibilidad o navegación por teclado.
- Reproducir un error con un snippet mínimo sin datos privados.
- Añadir pruebas o mejorar las instrucciones para tu sistema operativo.

## Reglas técnicas

Mantén separados interfaz, IPC, compilación, runtimes, paquetes e IA. Valida emisor y contenido de cada IPC. Nunca ejecutes snippets en main ni en el renderer de la interfaz. Los motores nuevos siguen `ExecutionEngine`: consulta [multilenguaje](docs/languages.md).

Para instrumentación, prueba efectos secundarios, evaluación única, líneas originales, asincronía y cancelación. Actualiza `docs/parity.md` y marca limitaciones reales.

Sin telemetría, servicios cloud obligatorios, cuotas ni código enviado automáticamente. Scripts de instalación de paquetes desactivados por defecto. No introduzcas secretos en ejemplos o fixtures.

Las contribuciones se distribuyen bajo MIT. Escribe ejemplos propios y mantén avisos de terceros. Ejecuta `pnpm licenses` cuando cambies dependencias. No se requiere CLA; al contribuir aceptas distribuir tu aportación bajo MIT.

## Revisión y comunidad

METAWISER mantiene el proyecto y decide las integraciones. Los PR deben ser acotados, superar CI y recibir revisión antes de integrarse. No hay publicación automática de releases. Consulta [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) y [SECURITY.md](SECURITY.md).

Las plantillas facilitan participar; no conceden permisos de escritura ni garantizan tiempos de respuesta. Un servidor de lenguaje Python, pip y otros motores se discutirán por separado.
