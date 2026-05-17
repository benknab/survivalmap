export const styles = `
:root {
  color: #e9fbff;
  background: #071312;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  min-width: 320px;
  min-height: 100vh;
  margin: 0;
  background:
    radial-gradient(circle at 20% 10%, rgba(77, 180, 176, 0.22), transparent 28rem),
    radial-gradient(circle at 90% 0%, rgba(124, 247, 212, 0.16), transparent 22rem),
    linear-gradient(145deg, #050b0d 0%, #071312 52%, #102323 100%);
}

main {
  display: grid;
  width: min(900px, 100%);
  min-height: 100vh;
  gap: 24px;
  align-content: center;
  margin: 0 auto;
  padding: 32px;
}

section {
  border: 1px solid rgba(130, 239, 221, 0.22);
  border-radius: 28px;
  background: rgba(9, 29, 29, 0.88);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.28);
}

.hero,
.tester {
  padding: 28px;
}

.eyebrow {
  margin: 0 0 10px;
  color: #7cf7d4;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

h1 {
  max-width: 720px;
  margin: 0;
  font-size: clamp(3rem, 9vw, 6rem);
  letter-spacing: -0.08em;
  line-height: 0.95;
}

h2 {
  margin: 0;
}

p {
  color: #9bbdbb;
  line-height: 1.6;
}

form {
  display: grid;
  gap: 14px;
  margin-top: 20px;
}

label {
  display: grid;
  gap: 7px;
  color: #9bbdbb;
  font-size: 0.9rem;
  font-weight: 700;
}

input,
textarea,
button {
  font: inherit;
}

input,
textarea {
  width: 100%;
  border: 1px solid rgba(124, 247, 212, 0.22);
  border-radius: 14px;
  color: #e9fbff;
  background: rgba(3, 14, 16, 0.86);
  outline: none;
}

input {
  height: 44px;
  padding: 0 12px;
}

textarea {
  min-height: 100px;
  padding: 12px;
  resize: vertical;
}

button,
.link-button {
  min-height: 48px;
  border: 0;
  border-radius: 16px;
  color: #031110;
  background: linear-gradient(135deg, #7cf7d4, #39d8b9);
  cursor: pointer;
  font-weight: 900;
}

.link-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  padding: 0 18px;
  text-decoration: none;
}

.form-error,
.field-error {
  color: #ffb4a8;
}

.form-error {
  margin-bottom: 0;
}

.field-error {
  margin: -8px 0 0;
  font-size: 0.9rem;
}

.map-card {
  overflow: hidden;
}

.map-id {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.map-id code {
  padding: 4px 8px;
  border-radius: 8px;
}

.grid-preview {
  min-height: 280px;
  margin: 26px 0;
  border: 1px solid rgba(124, 247, 212, 0.2);
  border-radius: 22px;
  background:
    linear-gradient(rgba(124, 247, 212, 0.12) 1px, transparent 1px),
    linear-gradient(90deg, rgba(124, 247, 212, 0.12) 1px, transparent 1px),
    radial-gradient(circle at center, rgba(124, 247, 212, 0.16), rgba(3, 14, 16, 0.92));
  background-size: 32px 32px, 32px 32px, 100% 100%;
}

code,
pre {
  color: #d8fff6;
  background: rgba(3, 14, 16, 0.86);
}

pre {
  overflow: auto;
  padding: 16px;
  border: 1px solid rgba(124, 247, 212, 0.18);
  border-radius: 16px;
}

@media (max-width: 620px) {
  main {
    padding: 16px;
  }

  .hero,
  .tester {
    padding: 20px;
  }
}
`;
