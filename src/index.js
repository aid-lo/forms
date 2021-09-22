class FormMan {
	static forms = {};
	_inputs = {};
	static initForms() {
		for (const f of document.forms)
			if (!FormMan.forms[f.name])
				FormMan.forms[f.name] = new FormMan(f);
	};
	static validateEmail(string) {
		return /^[^@.\s][^@\s]*@[^.@\s]+\.[^@\s]{2,}$/.test(string);
	};
	constructor(form) {
		this._element = form;
		this.init();
	};
	setSubmitFunction(fn) {
		if (this._submitFn)
			this._element.removeEventListener('submit', this._submitFn);
		this._element.addEventListener('submit', fn);
		this._submitFn = fn;
	};
	init() {
		this.setSubmitFunction(e => {
			e.preventDefault();
			const d = new URLSearchParams();
			let error = false;
			for (const i of this._element.getElementsByTagName('input')) if (i.type !== 'submit') {
				if (!error && this._inputs[i.name] && !this._inputs[i.name](i)) {
					i.focus();
					error = true;
				}
				else d.append(i.name, i.value);
			}
			if (error) return;
			fetch(this._element.action, {
				method: "POST",
				redirect: "follow",
				headers: {'X-Doji-Fetch': 'true'},
				body: d
			}).then(r => {
				if (r.redirected) {
					window.location.href = r.url;
					return {then: () => {}};
				}
				return r;
			}).then(r => r.text())
			.then(d => console.log(d));
		});
	};
	disable() {
		this.setSubmitFunction(e => e.preventDefault());
	};
	registerInputValidation(input, callback) {
		this._inputs[input] = callback;
	};
	removeInputValidation(input) {
		this._inputs[input] = null;
	};
}
