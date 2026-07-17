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

## Persistencia

Firestore colección `arquetipos_test/data/results` (y questions/archetypes vía admin).

Campo `aiRecommendations: null` reservado para OpenAI.

## Firestore rules (sugeridas)

```
match /arquetipos_test/data/results/{id} {
  allow create: if true;
  allow read, update, delete: if request.auth != null
    && get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.isAdmin == true;
}
match /arquetipos_test/data/questions/{id} {
  allow read: if true;
  allow write: if request.auth != null
    && get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.isAdmin == true;
}
match /arquetipos_test/data/archetypes/{id} {
  allow read: if true;
  allow write: if request.auth != null
    && get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.isAdmin == true;
}
```

Si el guardado falla, el resultado queda en `localStorage` como backup.
