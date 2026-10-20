# EcoAlerta — Plan de diseño del prototipo

Prototipo escolar. Principio rector: **lo mínimo que demuestre la idea clave**, que es *una misma app que muestra información distinta según la localidad elegida*.

## 1. Alcance del prototipo

**Entra (MVP):**
1. Selección de localidad y zona (primera vez, se recuerda).
2. Inicio con "próxima recolección" y recordatorio.
3. Calendario (recolección + eventos ambientales).
4. Mapa de puntos limpios con detalle.
5. Guía de separación de residuos (buscable).
6. Noticias e iniciativas (lista simple).

**No entra (se menciona como futuro en la presentación):** panel de administración, cuentas de usuario, backend/base de datos, notificaciones push reales, integración con datos oficiales, perfiles de municipio/escuela.

## 2. Decisiones técnicas (para mantenerlo simple)

| Tema | Decisión | Por qué |
|---|---|---|
| Tipo de app | **Web app mobile-first** (HTML + CSS + JavaScript puro), instalable como PWA si queda tiempo | Sin instalar nada, se abre en el celu o la compu, fácil de demostrar |
| Backend | **Ninguno** | Innecesario para un prototipo |
| Datos | **Un archivo JSON por localidad** en `data/` | Es la "carga manual" de la Etapa 1; agregar una localidad = agregar un archivo |
| Mapa | **Leaflet + OpenStreetMap** (CDN, gratis, sin API key) | Es lo más simple que existe |
| Estado del usuario | `localStorage` (localidad y zona elegidas) | Sin cuentas |
| Recordatorios | API `Notification` del navegador + banner en Inicio ("Mañana pasa el camión…") | Push real requiere servidor; se aclara como limitación del prototipo |
| Framework | **Ninguno** (un `index.html`, un `app.js`, un `styles.css`) | Menos herramientas, más fácil de explicar |

## 3. Cómo se logra la adaptabilidad (la clave)

La app **no contiene datos propios**: solo sabe *leer y mostrar* un JSON. Al elegir localidad, carga `data/<localidad>.json` y toda la interfaz se redibuja con eso.

```
data/
  localidades.json      ← lista para el selector
  tornquist.json        ← localidad piloto 1
  <otra-localidad>.json ← piloto 2 (demuestra la adaptación)
```

Estructura de cada archivo de localidad:

```json
{
  "nombre": "Tornquist",
  "centro": [-38.10, -62.22],
  "zonas": ["Centro", "Barrio Norte"],
  "recoleccion": [
    { "zona": "Centro", "dia": "martes", "horario": "07:00", "tipo": "Reciclables", "color": "verde", "aviso": "Sacá tu bolsa verde" }
  ],
  "materiales": {
    "aceptados": ["Cartón", "Vidrio", "Plástico PET"],
    "no_aceptados": ["Telgopor"]
  },
  "guia": [
    { "residuo": "Botella de plástico", "va_en": "Reciclables", "como_prepararlo": "Vaciala, enjuagala y aplastala." }
  ],
  "puntos": [
    { "nombre": "Punto Limpio Municipal", "tipo": "punto_limpio", "lat": -38.10, "lng": -62.22,
      "direccion": "…", "horario": "Lun a Vie 8–14", "materiales": ["Pilas", "Cartón"] }
  ],
  "eventos": [
    { "fecha": "2026-11-05", "titulo": "Jornada de limpieza", "lugar": "Plaza central", "organiza": "Escuela N°1" }
  ],
  "noticias": [
    { "fecha": "2026-10-10", "titulo": "…", "resumen": "…" }
  ]
}
```

> **Importante:** los datos de ejemplo deben marcarse como *datos de demostración* salvo que se consigan datos reales de Tornquist (conviene pedirlos a la municipalidad o inventarlos de forma explícita). La segunda localidad puede ser ficticia solo para mostrar el contraste.

## 4. Pantallas y navegación

Barra inferior con 5 pestañas (estilo app móvil):

```
[ Inicio ] [ Calendario ] [ Mapa ] [ Guía ] [ Noticias ]
```

| # | Pantalla | Contenido |
|---|---|---|
| 0 | **Bienvenida** (solo primera vez) | Logo, selector de localidad → selector de zona → botón "Empezar" |
| 1 | **Inicio** | Encabezado con localidad/zona (tocable para cambiar) · tarjeta grande "Próxima recolección: mañana, martes 07:00 — Reciclables 🟢" · botón "Activar recordatorio" · accesos rápidos a Mapa y Guía · próximo evento |
| 2 | **Calendario** | Vista de mes simple o lista cronológica con dos tipos de ítem: recolección y eventos ambientales (distinguidos por color/ícono) |
| 3 | **Mapa** | Mapa con pines por tipo (punto limpio, contenedor, compostera) · filtro por tipo · al tocar un pin: dirección, horario, materiales aceptados |
| 4 | **Guía** | Buscador "¿Dónde tiro…?" + lista por categoría (papel, vidrio, plástico, orgánico, pilas, electrónicos). Cada ítem: en qué va y cómo prepararlo |
| 5 | **Noticias** | Lista de tarjetas (fecha, título, resumen); sin detalle ni comentarios |

Flujo principal:

```
Primera vez: Bienvenida → elegir localidad → elegir zona → Inicio
Después:     Inicio (recuerda la localidad) → cualquier pestaña
Cambiar localidad: tocar el encabezado → volver al selector
```

## 5. Diseño visual

- **Estilo:** limpio, mucho espacio, tarjetas redondeadas, un solo color de marca (verde) + colores de bolsa/contenedor como acentos funcionales.
- **Paleta base:** verde `#2E7D32` (marca), verde claro `#E8F5E9` (fondos), gris oscuro `#263238` (texto), blanco; acentos: azul (vidrio/papel), amarillo (plásticos), marrón (orgánicos).
- **Tipografía:** una sola fuente del sistema o Inter; tamaños grandes y legibles.
- **Tono de texto:** cercano y en voseo ("Recordá sacar tu bolsa verde").
- **Accesibilidad básica:** contraste suficiente, botones de al menos 44 px, no depender solo del color (agregar ícono/texto).

## 6. Estructura de archivos propuesta

```
flopi/
  PLAN.md
  index.html          ← estructura de las pantallas
  styles.css
  app.js              ← carga JSON, renderiza pantallas, navegación, recordatorios
  data/
    localidades.json
    tornquist.json
    ejemplo.json      ← segunda localidad (demo)
  assets/
    logo.svg
```

## 7. Etapas de construcción sugeridas

1. **Esqueleto:** `index.html` + navegación por pestañas + estilos base.
2. **Datos y selector:** JSON de dos localidades, pantalla de bienvenida, guardado en `localStorage`.
3. **Inicio:** cálculo de "próxima recolección" a partir de día/horario y banner de recordatorio.
4. **Calendario y Noticias:** listas generadas desde el JSON.
5. **Mapa:** Leaflet con pines y filtros.
6. **Guía:** lista + buscador.
7. **Pulido y prueba:** probar cambio de localidad (la demostración clave), probar en celular, revisar textos.

## 8. Cómo mostrarlo en la presentación

- Demo en vivo: abrir como Tornquist → mostrar Inicio, Mapa y Guía → **cambiar a la otra localidad** y ver cómo cambian días, puntos, materiales y eventos sin tocar código.
- Diapositiva de futuro: Etapa 2 (panel de administración que edite estos mismos JSON) y Etapa 3 (más localidades, datos oficiales).
- Ser transparente con las limitaciones: datos cargados a mano, recordatorios solo con la app/navegador abierto.

## 9. Pendientes por definir

- ¿Qué localidades usar como piloto y de dónde salen los datos (reales vs. de demostración)?
- ¿Se presenta en celular, en compu o ambos?
- ¿Hay requisitos de la materia (tecnología obligatoria, formato de entrega, informe)?
