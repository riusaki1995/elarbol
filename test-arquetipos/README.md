# Test Oficial de Arquetipos TikTok LIVE — R.A.Í.C.E.S.™

Aplicación premium de Agencia El Árbol.

## Abrir

- Test: `test-arquetipos/index.html`
- Admin: `test-arquetipos/admin.html`
- Entrada desde lobby: cuadro **Formularios**

## Flujo

Bienvenida → Datos → 96 preguntas → Análisis → Resultado → PDF / Share / CTA

## Datos

- `data/archetypes.json` — 8 arquetipos + estrategias + plan 90 días
- `data/questions.json` — 96 preguntas seed (editables)

## Motor

`js/scoring.js` calcula arquetipo principal/secundario, afinidad %, nivel, 13 skills, top fortalezas/debilidades.

## Ver respuestas (tú / admin)

1. Entra a `test-arquetipos/admin.html` (o desde Formularios → **Ver respuestas del test**).
2. Inicia sesión con tu cuenta admin de Firebase (`isAdmin: true`).
3. En **Usuarios / Respuestas** verás a cada persona.
4. Clic en **Ver** → detalle con contacto, scores, skills y **cada respuesta**.
5. Exporta resumen o CSV completo (una fila por respuesta) para Excel.

### Qué se guarda por persona

- Nombre, correo, WhatsApp, @TikTok
- Fecha y tiempo del test
- Arquetipo principal / secundario, afinidad, nivel
- Las 96 respuestas (pregunta + letra + arquetipo)
- Scores y habilidades

### Firestore rules (necesarias para guardar/leer)

```
match /arquetipos_test/data/results/{id} {
  allow create: if true;
  allow read, update, delete: if request.auth != null
    && get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.isAdmin == true;
}
```
