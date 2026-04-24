/**
 * EventManager: シンプルなオブザーバーパターン（EventEmitter）の実装
 * クラス間の直接的な依存を減らし、疎結合な設計を実現します。
 */
export class EventManager {
    constructor() {
        this.listeners = {};
    }

    /**
     * イベントを購読する
     * @param {string} event イベント名
     * @param {function} callback コールバック関数
     */
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    /**
     * イベントを発火する
     * @param {string} event イベント名
     * @param {any} data 送信するデータ
     */
    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => callback(data));
        }
    }

    /**
     * イベントの購読を解除する
     * @param {string} event イベント名
     * @param {function} callback コールバック関数
     */
    off(event, callback) {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
}
