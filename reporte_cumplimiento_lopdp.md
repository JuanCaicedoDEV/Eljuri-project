# Reporte de Cumplimiento
## Ley Orgánica de Protección de Datos Personales (LOPDP)
### Aplicado al proyecto: ELjuri Voice Simulator

**Fecha de evaluación:** 12 de marzo de 2026
**Norma de referencia:** Ley Orgánica de Protección de Datos Personales — Registro Oficial Suplemento 459 del 26 de mayo de 2021 (Estado: Vigente)
**Clasificación:** Confidencial — Uso interno

---

## 1. Contexto y Alcance

El proyecto **ELjuri Voice Simulator** es una plataforma de simulación de agentes de voz con IA que:
- Recibe y procesa llamadas de voz en tiempo real mediante WebSockets
- Graba y transcribe conversaciones de usuarios
- Procesa transcripciones mediante Google Gemini (LLM externo)
- Extrae datos estructurados de las conversaciones
- Almacena números de teléfono, sesiones e historial de campañas

**Datos personales identificados en el sistema:**
| Tipo de dato | Clasificación LOPDP | Ubicación en el sistema |
|--------------|---------------------|------------------------|
| Número de teléfono | Dato personal (Art. 4) | `backend/src/models/PhoneNumber.ts` |
| Voz/audio del usuario | Dato biométrico (Art. 4) | WebSocket — streaming en tiempo real |
| Transcripciones de voz | Dato personal derivado | `backend/src/routes/extraction.ts` |
| Datos extraídos de conversaciones | Dato personal (variable) | Proceso de extracción Gemini |
| Patrones de comportamiento en llamadas | Elaboración de perfiles (Art. 4) | `frontend/store/useSimulationStore.ts` |

> **Nota legal relevante:** La voz es un **dato biométrico** (Art. 4 LOPDP) y los datos de salud o conducta que puedan desprenderse de las conversaciones pueden constituir **datos sensibles** (Art. 25), sujetos a protección reforzada bajo el Capítulo IV de la ley.

---

## 2. Evaluación por Artículo

---

### 2.1 Base de licitud del tratamiento — Art. 7

**Requisito legal:** El tratamiento de datos personales requiere al menos una base de licitud: consentimiento, obligación legal, interés público, interés legítimo, entre otras.

| Condición | Estado | Evidencia |
|-----------|--------|-----------|
| Consentimiento informado del titular (Art. 7.1) | ❌ INCUMPLIMIENTO | No existe mecanismo de consentimiento en el código |
| Alternativa de interés legítimo (Art. 7.8) | ⚠️ PARCIAL | Podría aplicar para simulaciones internas, pero no está documentado |
| Consentimiento para datos biométricos (voz) (Art. 26) | ❌ INCUMPLIMIENTO GRAVE | El audio se procesa sin ningún tipo de aviso al titular |

**Hallazgo:** El sistema procesa datos biométricos (voz) y genera transcripciones sin obtener ni documentar el consentimiento del titular. Esto constituye una violación directa al Art. 7 y Art. 26 de la LOPDP.

**Riesgo legal:** Infracción grave según Art. 68, numeral 2 ("Utilizar información o datos para fines distintos a los declarados") y potencialmente muy grave si hay datos sensibles involucrados.

**Remediación:**
- Implementar aviso de privacidad previo al inicio de la simulación
- Obtener y registrar el consentimiento explícito antes de procesar voz
- Documentar la base de licitud aplicable para cada tipo de tratamiento

---

### 2.2 Consentimiento — Art. 8

**Requisito legal:** El consentimiento debe ser libre, específico, informado e inequívoco. Puede revocarse en cualquier momento.

| Requisito | Estado |
|-----------|--------|
| Consentimiento libre | ❌ No implementado |
| Consentimiento específico por finalidad | ❌ No implementado |
| Consentimiento informado | ❌ No existe aviso de privacidad |
| Mecanismo de revocación | ❌ No existe |

**Hallazgo:** El sistema no cuenta con ningún módulo de gestión de consentimiento. No hay aviso de privacidad, ni pantalla de aceptación, ni mecanismo para revocar el consentimiento.

---

### 2.3 Principios del tratamiento — Art. 10

| Principio | Estado | Análisis |
|-----------|--------|---------|
| **a) Juridicidad** | ❌ Incumplimiento | No existe base de licitud documentada |
| **b) Lealtad** | ❌ Incumplimiento | No se informa al titular del tratamiento de su voz |
| **c) Transparencia** | ❌ Incumplimiento | No hay política de privacidad ni aviso al titular |
| **d) Finalidad** | ⚠️ Riesgo | Las transcripciones se envían a Gemini (tercero) sin declaración de finalidad |
| **e) Minimización** | ❌ Incumplimiento | Se almacenan números de teléfono sin evaluación de necesidad |
| **f) Proporcionalidad** | ⚠️ Riesgo | No se ha evaluado si el volumen de datos es estrictamente necesario |
| **g) Confidencialidad** | ❌ Incumplimiento | API keys expuestas, datos en memoria sin cifrado, sin contratos de confidencialidad |
| **h) Calidad y exactitud** | ⚠️ Parcial | No hay proceso de actualización ni corrección de datos |
| **i) Conservación** | ❌ Incumplimiento | Datos en memoria sin política de retención ni eliminación programada |
| **j) Seguridad** | ❌ Incumplimiento | Múltiples vulnerabilidades de seguridad identificadas (ver reporte de ciberseguridad) |
| **k) Responsabilidad proactiva** | ❌ Incumplimiento | No hay evidencia de medidas implementadas, evaluaciones de riesgo ni rendición de cuentas |

---

### 2.4 Derecho a la información — Art. 12

**Requisito legal:** El titular tiene derecho a conocer: fines del tratamiento, base legal, tipos de tratamiento, tiempo de conservación, identidad del responsable, y cómo ejercer sus derechos (acceso, rectificación, eliminación, oposición, portabilidad).

**Estado: ❌ INCUMPLIMIENTO TOTAL**

El sistema no proporciona ninguna de las 17 informaciones requeridas por el Art. 12 al titular de los datos. No existe aviso de privacidad, política de tratamiento, ni canal de comunicación para ejercer derechos.

---

### 2.5 Derechos ARCO (Acceso, Rectificación, Cancelación, Oposición) — Arts. 13-16

| Derecho | Art. | Estado |
|---------|------|--------|
| Acceso gratuito a datos personales | Art. 13 | ❌ No implementado |
| Rectificación y actualización (plazo 15 días) | Art. 14 | ❌ No implementado |
| Eliminación de datos | Art. 15 | ❌ No implementado |
| Oposición al tratamiento | Art. 16 | ❌ No implementado |
| Portabilidad de datos | Art. 17 | ❌ No implementado |
| Suspensión del tratamiento | Art. 19 | ❌ No implementado |

**Hallazgo crítico:** El sistema no ofrece ningún mecanismo para que los titulares ejerzan sus derechos fundamentales de protección de datos. Esto constituye un incumplimiento estructural de los Arts. 13 al 19 de la LOPDP.

---

### 2.6 Datos biométricos y sensibles — Arts. 25-26

**Requisito legal:** El tratamiento de datos biométricos (como la voz) está **prohibido** salvo excepciones taxativas (Art. 26), siendo la principal el consentimiento explícito del titular.

| Tipo de dato | Estado |
|--------------|--------|
| Voz del titular (dato biométrico — Art. 4) | ❌ Procesado sin consentimiento explícito |
| Posibles datos de salud en conversaciones | ❌ Sin evaluación ni protección reforzada |
| Elaboración de perfiles de comportamiento | ❌ Sin aviso ni consentimiento (Art. 20) |

**Riesgo:** El procesamiento de voz sin consentimiento explícito puede constituir una **infracción muy grave** bajo la LOPDP, con sanciones de hasta el **2% del volumen de negocio** del responsable.

---

### 2.7 Transferencia de datos a terceros (Google Gemini) — Arts. 33-35 y Cap. IX

**Análisis:** El sistema envía transcripciones y datos de conversaciones a Google Gemini, un proveedor externo con servidores potencialmente fuera del Ecuador.

| Requisito | Estado |
|-----------|--------|
| Consentimiento del titular para transferencia (Art. 33) | ❌ No existe |
| Contrato con encargado del tratamiento (Art. 34) | ❌ No documentado |
| Evaluación de nivel adecuado de protección del destinatario (Art. 56) | ❌ No realizada |
| Garantías adecuadas para transferencia internacional (Art. 57) | ❌ No establecidas |
| Registro de transferencia internacional (Art. 59) | ❌ No registrado |

**Hallazgo:** La transferencia de datos a Google (Gemini API) constituye potencialmente una **transferencia internacional de datos personales** bajo el Art. 3 y Capítulo IX de la LOPDP. Sin evaluación de nivel de protección, sin contrato de encargado del tratamiento y sin consentimiento del titular, esta transferencia es **ilícita** bajo la ley ecuatoriana.

---

### 2.8 Seguridad de datos personales — Arts. 37-46

| Requisito | Estado | Detalle |
|-----------|--------|---------|
| Medidas técnicas de seguridad (Art. 37) | ❌ Incumplimiento | Ver reporte de ciberseguridad — 15 vulnerabilidades activas |
| Protección desde el diseño y por defecto (Art. 39) | ❌ Incumplimiento | No se consideró la privacidad en el diseño del sistema |
| Análisis de riesgos y vulnerabilidades (Art. 40) | ❌ No realizado | No hay evidencia de análisis formal de riesgos |
| Evaluación de impacto (Art. 42) | ❌ No realizado | Obligatoria dado el tratamiento de datos biométricos |
| Notificación de vulneraciones en 5 días (Art. 43) | ❌ Sin proceso | No existe proceso de detección ni notificación |
| Cifrado de datos personales (Art. 37.1) | ❌ No implementado | Datos en memoria sin cifrado |

**Nota sobre Art. 42 (Evaluación de Impacto):** La evaluación de impacto es **obligatoria** cuando el tratamiento involucra elaboración de perfiles mediante procesos automatizados (literal a), o tratamiento a gran escala de categorías especiales de datos (literal b). El procesamiento de voz y generación de transcripciones mediante IA cumple ambos criterios.

---

### 2.9 Obligaciones del responsable del tratamiento — Art. 47

| Obligación | Estado |
|------------|--------|
| Tratar datos conforme a principios de la LOPDP (Art. 47.1) | ❌ Incumplimiento |
| Implementar medidas técnicas y organizativas (Art. 47.2) | ❌ Incumplimiento |
| Implementar protección desde el diseño y por defecto (Art. 47.9) | ❌ Incumplimiento |
| Suscribir contratos de confidencialidad con personal (Art. 47.10) | ❌ No evidenciado |
| Garantizar medidas con encargados (Google, etc.) (Art. 47.11) | ❌ No evidenciado |
| Registrar en Registro Nacional de Protección de Datos (Art. 47.12) | ❌ No realizado |
| Designar Delegado de Protección de Datos si aplica (Art. 47.13) | ⚠️ Evaluar si aplica |
| Permitir auditorías (Art. 47.14) | ⚠️ No evaluado |

---

### 2.10 Delegado de Protección de Datos — Art. 48

**Análisis:** Se debe evaluar si la actividad del sistema requiere la designación de un Delegado de Protección de Datos (DPO). Dado que:
- Procesa datos biométricos (voz) a gran escala
- Realiza elaboración de perfiles automatizada
- Potencialmente trata datos sensibles derivados de conversaciones

**Conclusión:** Es probable que la designación de un DPO sea **obligatoria** conforme al Art. 48, numerales 2 y 3.

---

## 3. Régimen Sancionatorio Aplicable — Arts. 67-74

Con base en los incumplimientos identificados, el responsable del tratamiento podría enfrentar las siguientes sanciones bajo la LOPDP:

| Tipo de infracción | Artículo | Posible sanción (entidad privada) |
|--------------------|----------|----------------------------------|
| No implementar protección desde el diseño | Art. 67.2 (leve) | 0.1% a 0.7% del volumen de negocio |
| No implementar medidas de seguridad técnicas | Art. 68.1 (grave) | 0.7% a 1% del volumen de negocio |
| Tratar datos biométricos sin consentimiento | Art. 68 (grave) | 0.7% a 1% del volumen de negocio |
| No notificar vulneraciones de seguridad | Art. 68.7 (grave) | 0.7% a 1% del volumen de negocio |
| No realizar evaluación de impacto obligatoria | Art. 68.5 (grave) | 0.7% a 1% del volumen de negocio |
| Transferencia internacional sin garantías | Art. 68.3 (grave) | 0.7% a 1% del volumen de negocio |

> Las sanciones pueden ser acumulativas y se incrementan por reiteración y reincidencia (Art. 72).

---

## 4. Plan de Adecuación a la LOPDP

### Prioridad 1 — Urgente (antes de cualquier uso con datos reales)

1. **Suspender el procesamiento de voz en producción** hasta implementar consentimiento
2. **Elaborar aviso de privacidad** con los 17 elementos del Art. 12
3. **Implementar mecanismo de consentimiento** previo al procesamiento de voz
4. **Suscribir DPA (Data Processing Agreement)** con Google para el uso de Gemini API
5. **Evaluar si Google cumple nivel adecuado de protección** bajo Art. 56-57 LOPDP

### Prioridad 2 — Corto plazo (1-3 meses)

6. **Implementar módulo ARCO** para que los titulares ejerzan sus derechos (Arts. 13-17)
7. **Realizar Evaluación de Impacto de Protección de Datos (EIPD/DPIA)** — obligatoria bajo Art. 42
8. **Definir política de retención y eliminación** de datos (Art. 10.i)
9. **Implementar cifrado** de datos personales en tránsito y reposo (Art. 37)
10. **Establecer proceso de notificación de brechas** (Arts. 43-46, plazo 5 días)

### Prioridad 3 — Mediano plazo (3-6 meses)

11. **Evaluar designación de Delegado de Protección de Datos** (Art. 48)
12. **Registrar tratamientos en el Registro Nacional** de Protección de Datos Personales (Art. 51)
13. **Suscribir contratos de confidencialidad** con todo el personal (Art. 47.10)
14. **Implementar protección de datos desde el diseño** en nuevas funcionalidades (Art. 39)
15. **Desarrollar política interna** de protección de datos y capacitar al equipo

---

## 5. Tabla de Cumplimiento General

| Área | Artículos LOPDP | Nivel de Cumplimiento |
|------|-----------------|----------------------|
| Base de licitud | Arts. 7-9 | ❌ 0% |
| Principios del tratamiento | Art. 10 | ❌ 9% (1 de 11 principios parcialmente) |
| Derechos del titular | Arts. 12-24 | ❌ 0% |
| Datos biométricos y sensibles | Arts. 25-26 | ❌ 0% |
| Transferencia a terceros | Arts. 33-36 | ❌ 0% |
| Transferencia internacional | Arts. 55-61 | ❌ 0% |
| Seguridad de datos | Arts. 37-46 | ❌ 5% (medidas mínimas) |
| Obligaciones del responsable | Art. 47 | ❌ 5% |
| Responsabilidad proactiva | Arts. 52-54 | ❌ 0% |
| **CUMPLIMIENTO GLOBAL** | | **❌ ~2%** |

---

## 6. Conclusiones

El proyecto **ELjuri Voice Simulator** presenta un nivel de cumplimiento cercano a **0% respecto a la LOPDP**. El sistema procesa datos biométricos (voz) y genera perfiles de comportamiento sin ninguna de las salvaguardas exigidas por la ley ecuatoriana.

Los riesgos legales son **significativos y concretos**:

1. El procesamiento de voz sin consentimiento constituye una infracción grave (Art. 68)
2. La transferencia de datos a Google sin DPA y sin evaluación de adecuación es ilícita (Cap. IX)
3. La ausencia de evaluación de impacto para tratamiento de datos biométricos es una infracción grave (Art. 68.5)
4. La falta de mecanismos ARCO (acceso, rectificación, eliminación, oposición) viola los Arts. 13-16

**Recomendación final:** Antes de operar con datos de usuarios reales, se debe realizar un proceso formal de adecuación a la LOPDP, comenzando por la obtención de consentimiento informado, la suscripción de acuerdos con procesadores de datos (Google) y la implementación de las medidas de seguridad descritas en el reporte de ciberseguridad adjunto.

---

*Reporte elaborado el 12 de marzo de 2026*
*Referencia legal: Ley Orgánica de Protección de Datos Personales — Registro Oficial Suplemento 459, 26 de mayo de 2021*
*Proyecto evaluado: ELjuri Voice Simulator — Uso interno y confidencial*
