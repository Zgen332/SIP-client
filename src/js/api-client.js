export class APIClient {
    constructor(baseURL) {
        this.baseURL = baseURL;
    }
    async getAppeals() { return []; } // Пока возвращает пустой список
    async createAppeal(data) { console.log('API: Создание обращения', data); }
    async getCalls() { return []; }
}