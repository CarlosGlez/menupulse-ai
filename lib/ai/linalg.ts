// Álgebra lineal mínima para matrices simétricas definidas positivas pequeñas (d ≈ 14).
// Matrices guardadas como arreglos planos fila-mayor de longitud d*d.

export function identity(d: number): number[] {
  const m = new Array(d * d).fill(0);
  for (let i = 0; i < d; i++) m[i * d + i] = 1;
  return m;
}

export function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

/** A += x xᵀ (in place) */
export function addOuterInPlace(A: number[], x: number[]): void {
  const d = x.length;
  for (let i = 0; i < d; i++) {
    const xi = x[i];
    if (xi === 0) continue;
    for (let j = 0; j < d; j++) A[i * d + j] += xi * x[j];
  }
}

/** Factorización de Cholesky: A = L Lᵀ. Lanza error si A no es definida positiva. */
export function cholesky(A: number[], d: number): number[] {
  const L = new Array(d * d).fill(0);
  for (let i = 0; i < d; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = A[i * d + j];
      for (let k = 0; k < j; k++) sum -= L[i * d + k] * L[j * d + k];
      if (i === j) {
        if (!(sum > 1e-12)) throw new Error("Matriz no definida positiva");
        L[i * d + i] = Math.sqrt(sum);
      } else {
        L[i * d + j] = sum / L[j * d + j];
      }
    }
  }
  return L;
}

/** Resuelve A y = v usando el factor de Cholesky L. */
export function choleskySolve(L: number[], v: number[]): number[] {
  const d = v.length;
  const z = new Array(d).fill(0);
  for (let i = 0; i < d; i++) {
    let s = v[i];
    for (let k = 0; k < i; k++) s -= L[i * d + k] * z[k];
    z[i] = s / L[i * d + i];
  }
  const y = new Array(d).fill(0);
  for (let i = d - 1; i >= 0; i--) {
    let s = z[i];
    for (let k = i + 1; k < d; k++) s -= L[k * d + i] * y[k];
    y[i] = s / L[i * d + i];
  }
  return y;
}

export function allFinite(v: number[]): boolean {
  return v.every((n) => Number.isFinite(n));
}
