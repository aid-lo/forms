/**
 * Stores references to form management API objects.
 * @type Object<Object<FormManagementAPI>>
 */
const formAPI = {

	/**
	 * Form management APIs by the form element's name attribute.
	 * @type Object<FormManagementAPI>
	 */
	byName: {},

	/**
	 * Form management APIs by the form element's ID attribute.
	 * @type Object<FormManagementAPI>
	 */
	byID: {}
};

/**
 * Finds any unmanaged forms and initialises them with this module. This happens when the module is first loaded, but
 * can be re-called if forms are added later on. If only one form needs to be added, use `manageForm` instead.
 * @return void
 */
export function loadAllForms() {
	for (const formElement of document.forms)
		manageForm(formElement);
}

// Initialise all forms when the module is loaded
loadAllForms();

/**
 * Gets the form management API for a form. Attempts to initialise the form if it is new, but otherwise returns false
 * if the form does not exist.
 * @param {HTMLFormElement | string} form A form element or its name or ID attribute.
 * @return {FormManagementAPI | false}
 */
export function manageForm(form= '') {
	switch (typeof form) {
		case "string":
			return formAPI.byName[form] ?? formAPI.byID[form] ?? (() => {
				for (const formElement of document.forms)
					if (formElement.name === form)
						return formAPI.byName[formElement.name] = formAPI.byID[formElement.id] = new FormManagementAPI(formElement);
				for (const formElement of document.forms) {
					if (formElement.id === form)
						return formAPI.byName[formElement.name] = formAPI.byID[formElement.id] = new FormManagementAPI(formElement);
				}
				return false;
			})();
		case "object":
			return formAPI.byName[form.name] ?? formAPI.byID[form.id] ?? (formAPI.byName[form.name] = formAPI.byID[form.id] = new FormManagementAPI(form));
	}
}

/**
 * A module for managing web forms. Handles async submit and validation.
 */
export default {
	manageForm: manageForm,
	loadAllForms: loadAllForms
}

/**
 * API for managing a form.
 * @param {HTMLFormElement} formElement
 * @constructor
 */
function FormManagementAPI(formElement) {

	// TODO: add support for input validation functions that work via a promise or callback

	/**
	 * A callback that is used to test validation of an input when a form is submitted.
	 * @callback InputValidationFunction
	 * @param {HTMLInputElement} input
	 * @return boolean
	 */

	/**
	 * Validation functions for inputs within this form.
	 * @type Object<InputValidationFunction>
	 */
	const inputs = {};

	/**
	 * A callback for handling fetch response.
	 * @callback FetchPromiseCallback
	 * @param {Promise<Response>} response
	 */

	/**
	 * Placeholder for a fetch callback that the user can override.
	 * @param {Promise<Response>} response
	 */
	let fetchCallback = response => {};

	/**
	 * User overridden fetch parameters.
	 * @type RequestInit
	 */
	let fetchInit = {};

	/**
	 * This form's submit event handler.
	 * @param {SubmitEvent} event
	 * @return void
	 */
	const onSubmit = event => {

		// Prevent normal submit behaviour
		event.preventDefault();

		// Request is sent URL encoded
		// TODO: add support for other methods
		const params = new URLSearchParams();

		// Cycle through inputs, validating them
		// Error is set to true if validation fails
		let error = false;
		for (const input of formElement.getElementsByTagName('input')) {
			// Only process inputs that aren't the submit button
			if (input.type !== 'submit') {
				// If a validation function has been registered for the input, test it
				// All are tested, even if an error is found as the user might have UX logic in them
				// TODO: an option to abort after the first error
				if (inputs[input.name] && !inputs[input.name](input) && !error) {
					error = true;
					// First input to raise validation error gets focused
					input.focus();
				}
				// Continue appending data to the parameters so long as no error has raised
				else if (!error) params.append(input.name, input.value);
			}
		}

		// Cancel submit if there is a validation problem
		if (error) return;

		fetchCallback(fetch(formElement.action, Object.assign({
			body: params,
			method: formElement.method
		}, fetchInit)));
	};

	// Manage the form's submit event by default
	formElement.addEventListener('submit', onSubmit);
	let isHandlingSubmit = true;

	let api;
	return api = {

		/**
		 * Enables handling the submit event for the form. (Enabled by default.)
		 * @return FormManagementAPI
		 */
		enableSubmitHandling: () => {
			if (!isHandlingSubmit) {
				formElement.addEventListener('submit', onSubmit);
				isHandlingSubmit = true;
			}
			return api;
		},

		/**
		 * Disables handling the submit event for the form.
		 * @return FormManagementAPI
		 */
		disableSubmitHandling: () => {
			if (isHandlingSubmit) {
				formElement.removeEventListener('submit', onSubmit);
				isHandlingSubmit = false;
			}
			return api;
		},

		/**
		 * Registers an input validation function.
		 * Validation functions are passed the input element as a parameter, and **must return a boolean value**.
		 *
		 * Only one function is registered at a time. Subsequent calls for the same input will simply replace the
		 * previously registered function.
		 *
		 * @param {string} inputName The name attribute of the input.
		 * @param {InputValidationFunction} validationFn
		 * @return FormManagementAPI
		 */
		registerInputValidator: (inputName, validationFn) => {
			inputs[inputName] = validationFn;
			return api;
		},

		/**
		 * Removes an input validation function that was previously registered.
		 * @param {string} inputName The name attribute of the input.
		 * @return FormManagementAPI
		 */
		removeInputValidator: inputName => {
			delete inputs[inputName];
			return api;
		},

		/**
		 * Set the callback that handles the fetch response promise upon a successful submit event.
		 * @param {FetchPromiseCallback} callback A promise from the fetch API.
		 * @return FormManagementAPI
		 */
		setSubmitResponseCallback: callback => {
			fetchCallback = callback;
			return api;
		},

		/**
		 * Override parameters that are set in the fetch RequestInit upon a successful submit event.
		 * @param {RequestInit} fetchParams
		 * @return FormManagementAPI
		 */
		setFetchParams: fetchParams => {
			console.log(api);
			fetchInit = fetchParams;
			return api;
		}
	};
}

/**
 * API for managing a form. All functions return the API, so function calls can be chained together in one statement.
 * @typedef FormManagementAPI
 * @property {function: FormManagementAPI} enableSubmitHandling Enables handling the submit event for the form. (Enabled by default.)
 * @property {function: FormManagementAPI} disableSubmitHandling Disables handling the submit event for the form.
 * @property {function(inputName: string): FormManagementAPI} registerInputValidator Registers an input validation function. Validation functions are passed the input element as a parameter, and **must return a boolean value**. Only one function is registered at a time. Subsequent calls for the same input will simply replace the previously registered function.
 * @property {function(inputName: string): FormManagementAPI} removeInputValidator Removes an input validation function that was previously registered.
 * @property {function(callback: FetchPromiseCallback): FormManagementAPI} setSubmitResponseCallback Set the callback that handles the fetch response promise upon a successful submit event.
 * @property {function(fetchParams: RequestInit): FormManagementAPI} setFetchParams Override parameters that are set in the fetch RequestInit upon a successful submit event.
 */
