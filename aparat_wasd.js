// Aparat sayfaları (anten askısı, tava askısı) için WASD serbest gezinme. OrbitControls ile birlikte çalışır:
// kamera ve dönme merkezi (controls.target) birlikte kaydırılır, fareyle döndürme/yakınlaştırma bozulmaz.
// W/S ileri-geri (bakış yönü), A/D sola-sağa, Space/E yukarı, C/Q aşağı, Shift hızlı.
// Ana uygulamadaki Alt+Tab hatasından ders (AJAN_DEVIR 2026-10-09): pencere odağı gidince tuşlar bırakılır,
// Shift durumu her olayda olayın kendisinden okunur.
import * as THREE from 'three';

export function enableWasd(camera, controls, opts = {}) {
  const speed = opts.speed ?? 1.5;       // m/s
  const fastMul = opts.fastMul ?? 4;
  const keys = { f: false, b: false, l: false, r: false, u: false, d: false, fast: false };
  const map = { KeyW: 'f', KeyS: 'b', KeyA: 'l', KeyD: 'r', Space: 'u', KeyE: 'u', KeyC: 'd', KeyQ: 'd' };
  const isTyping = e => {
    const t = e.target;
    return t && (t.tagName === 'TEXTAREA' || t.isContentEditable || (t.tagName === 'INPUT' && !['range', 'checkbox', 'button'].includes(t.type)));
  };
  const onKey = down => e => {
    keys.fast = e.shiftKey;
    if (isTyping(e)) return;
    const k = map[e.code];
    if (!k) return;
    keys[k] = down;
    e.preventDefault();
  };
  const reset = () => Object.keys(keys).forEach(k => { keys[k] = false; });
  window.addEventListener('keydown', onKey(true));
  window.addEventListener('keyup', onKey(false));
  window.addEventListener('blur', reset);
  document.addEventListener('visibilitychange', () => { if (document.hidden) reset(); });

  const fwd = new THREE.Vector3(), right = new THREE.Vector3(), move = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  // Her karede çağrılır; dt saniye
  return function update(dt) {
    move.set(0, 0, 0);
    camera.getWorldDirection(fwd);
    right.crossVectors(fwd, up).normalize();
    if (keys.f) move.add(fwd);
    if (keys.b) move.sub(fwd);
    if (keys.r) move.add(right);
    if (keys.l) move.sub(right);
    if (keys.u) move.add(up);
    if (keys.d) move.sub(up);
    if (move.lengthSq() === 0) return;
    move.normalize().multiplyScalar(speed * (keys.fast ? fastMul : 1) * Math.min(dt, 0.1));
    camera.position.add(move);
    controls.target.add(move);
  };
}
