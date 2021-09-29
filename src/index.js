(function (root, node, browser) {
	if (typeof exports === 'object') module.exports = node();
	else root.FormMan = browser(node());
}(this,

/**
 * @returns {{}} An object that will be available in BOTH Node & a browser.
 */
() => {
	return {
		validateEmail: string => {
			return /^[^@.\s][^@\s]*@[^.@\s]+\.[^@\s]{2,}$/.test(string);
		}
	};
},

/**
 * @param formMan Logic from the previous block.
 * @returns {{}} An object that will be available in browser ONLY.
 */
formMan => {

	/**
	 * @callback InputValidateCallback A callback used to validate an input before submitting a form.
	 * @param {HTMLInputElement} input The input element.
	 */

	/**
	 * Managed collection of Forms
	 * @type {{Form}}
	 */
	const forms = {};

	/**
	 * Class for managing a form with FormMan.
	 */
	class Form {
		/**
		 * Validation callback functions used to validate the form's inputs.
		 * @type {{InputValidateCallback}}
		 * @private
		 */
		_inputs = {};

		/**
		 * Set up an instance from a Form element.
		 * @param {HTMLFormElement} form
		 */
		constructor(form) {
			forms[form.name] = this;
			this._element = form;
			this.activate();
		};

		/**
		 * Set the function fired on submit.
		 * @param {function} fn
		 */
		setSubmitFunction(fn) {
			if (this._submitFn)
				this._element.removeEventListener('submit', this._submitFn);
			this._element.addEventListener('submit', fn);
			this._submitFn = fn;
		};

		/**
		 * Set the form to use FormMan for validating and POSTing the form using fetch.
		 */
		activate() {
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

		/**
		 * Disable the form. Submit button will do nothing.
		 */
		disable() {
			this.setSubmitFunction(e => e.preventDefault());
		};

		/**
		 * Registers a callback that will fire when a form is submitted to verify the content of an input. If a form has at
		 * least one input validation callback return false, then the data will not be POSTed.
		 * @param {string} input The name attribute of an input element of the form.
		 * @param {InputValidateCallback} callback The function used to validate an input before submitting the form. The
		 * input element is passed through.
		 */
		registerInputValidation(input, callback) {
			this._inputs[input] = callback;
		};

		/**
		 * Removes the callback associated with an input.
		 * @param {string} input The name attribute of an input element of the form.
		 */
		removeInputValidation(input) {
			this._inputs[input] = null;
		};
	}

	/**
	 * Set up an individual form in the document.
	 * @param {HTMLFormElement} form The form element.
	 */
	formMan.initForm = form => {
		if (!forms[form.name])
			new Form(form);
	};

	/**
	 * Set up all uninitialised forms in the document.
	 */
	formMan.initAllForms = () => {
		for (const f of document.forms)
			formMan.initForm(f);
	};

	/**
	 * Set the form to use FormMan for validating and submitting the form. Form will submit to the URL in the "action"
	 * attribute using the fetch API. The data will be sent as URL encoded data using URLSearchParams().
	 * @param {string} form The name attribute of an initialised form.
	 */
	formMan.activate = form => {
		const f = forms[form];
		if (!f) return;
		f.activate();
	};

	/**
	 * Disables the form. Note that nothing will happen when the submit button is pressed.
	 * @param {string} form The name attribute of an initialised form.
	 */
	formMan.disable = form => {
		const f = forms[form];
		if (!f) return;
		f.disable();
	};

	/**
	 * Registers a callback that will fire when a form is submitted to verify the content of an input. If a form has at
	 * least one input validation callback return false, then the data will not be POSTed.
	 * @param {string} form The name attribute of a form element.
	 * @param {string} input The name attribute of an input element of the form.
	 * @param {InputValidateCallback} callback The function used to validate an input before submitting the form. The
	 * input element is passed through.
	 */
	formMan.registerInputValidation = (form, input, callback) => {
		const f = forms[form];
		if (!f) return;
		f.registerInputValidation(input, callback);
	};

	/**
	 * Removes the callback associated with an input.
	 * @param {string} form The name attribute of a form element.
	 * @param {string} input The name attribute of an input element of the form.
	 */
	formMan.removeInputValidation = (form, input) => {
		const f = forms[form];
		if (!f) return;
		f.removeInputValidation(input);
	};

	return formMan;
}));
