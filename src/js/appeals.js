export class AppealsModule {
    constructor(api) {
        this.api = api;
        this.form = document.getElementById('appealForm');
    }
    init() {
        this.form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            alert('Обращение создано (тест)');
            this.form.reset();
        });
    }
    prefillForm(number) {
        const el = document.getElementById('appealPhone');
        if(el) el.value = number;
    }
}