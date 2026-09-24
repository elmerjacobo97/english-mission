# Prompt de autor — borrador de misión

Usa este prompt fuera del juego. El borrador no se publica hasta revisión humana. El borrador no entra al currículo sin revisión humana. Nadie marca `written: true` ni copia el JSON a `src/shared/lib/curriculum/missions/` hasta que una persona lo revise y `curriculum.test.ts` pase.

No llames al gateway, a OpenRouter ni a ningún modelo desde la app o desde un script del repo.

## Entrada

Pega la entrada de `plan.json` de la misión: orden, slug, título, subtítulo, banda, nivel CEFR, nivel numérico, elenco y vocabulario. Pega también el vocabulario de las misiones anteriores del mismo plan, en orden.

## Salida

Devuelve solo un array JSON de beats, del tipo `Beat` que ya existe. No cambies slug, elenco, vocabulario ni orden del plan.

## Reglas

- Escribe de 8 a 16 beats.
- Incluye al menos 3 retos. En nivel 4 usa solo `choice`, `order`, `type`, `fill` y `listen`. En nivel 5 también puedes usar `dialogue`.
- Incluye al menos 2 notas gramaticales. Cada `note.body` tiene entre 21 y 280 caracteres. Cada `note.title` no está vacío.
- Usa el vocabulario declarado en el plan. Cada palabra inglesa aparece en el material en inglés de la misión, como palabra completa, no dentro de otra palabra.
- En un beat `story`, cada término de su `vocab` aparece en el `en` de ese mismo beat.
- Recicla al menos 3 palabras inglesas ya introducidas por misiones anteriores. Esas palabras van en el inglés de los beats.
- El español es neutro para Latinoamérica. No uses: dependiente, nevera, ordenador, móvil, piso, coche, vosotros, zumo, patata, coger, camarero, conducir, aparcar, tarta.
- Los personajes que hablan o aparecen en `character` son solo los del elenco declarado. Coco es el tutor. Hay uno o dos personajes más.
- El inglés enseña. La narración en español no traduce palabra por palabra cada beat.
