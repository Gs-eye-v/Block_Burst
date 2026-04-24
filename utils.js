/**
 * 汎用ユーティリティ関数
 */

/**
 * カラーの明度を調整する関数
 * @param {string} color - 16進数カラーコード (例: "#ffffff")
 * @param {number} percent - 調整する割合 (正の値で明るく、負の値で暗く)
 * @returns {string} - 調整後の16進数カラーコード
 */
export function shadeColor(color, percent) {
    let R = parseInt(color.substring(1, 3), 16);
    let G = parseInt(color.substring(3, 5), 16);
    let B = parseInt(color.substring(5, 7), 16);
    R = parseInt(R * (100 + percent) / 100);
    G = parseInt(G * (100 + percent) / 100);
    B = parseInt(B * (100 + percent) / 100);
    R = (R < 255) ? R : 255; G = (G < 255) ? G : 255; B = (B < 255) ? B : 255;
    let r = ((R.toString(16).length == 1) ? "0" + R.toString(16) : R.toString(16));
    let g = ((G.toString(16).length == 1) ? "0" + G.toString(16) : G.toString(16));
    let b = ((B.toString(16).length == 1) ? "0" + B.toString(16) : B.toString(16));
    return "#" + r + g + b;
}

/**
 * シード値に基づいた決定論的な乱数を生成する
 * @param {number} seed - シード値
 * @returns {number} - 0以上1未満の乱数
 */
export function getSeededRandom(seed) {
    // Simple deterministic random function for consistent level design
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}
