var Module = {};
var _app = {

    // Initialize the app functionality
    init: function () {
        _app.initModule();
        _app.bind();
    },

    // Do all the event bindings for the app
    bind: function () {
        document.getElementById('main').addEventListener('submit', _app.onMainFormSubmit);
        document.getElementById('copy-result').addEventListener('click', _app.onCopyResultClick);
        document.addEventListener('runtime-init', _app.onRuntimeInit);
    },

    // Add initial settins for the WASM module
    initModule: function () {
        Module.print = _app.wasmOutput;
        Module.printErr = _app.wasmOutputError;

        // Trigger the runtime-init events
        Module.onRuntimeInitialized = function () {
            document.dispatchEvent(new CustomEvent('runtime-init'));
        };
    },

    // Hnadle runtime initilization event
    onRuntimeInit: function () {
        // Do a first initial calculation, to speedup all subsequent calls
        Module.ccall('convert_unit', 'string', ['string', 'string'], ['1inch', 'm']);
        _app.displayResult('', false);

        // Hide the preloader once the module intializes
        document.getElementById('loader').classList.add('invisible');
    },

    // Handle form calculations
    onMainFormSubmit: function (event) {
        event.preventDefault();
        Module.ccall('convert_unit', 'string', ['string', 'string'], [this['you-have'].value, this['you-want'].value]);
    },

    // Handle copy result button click
    onCopyResultClick: function () {
        navigator.clipboard.writeText(document.querySelector('#result strong').innerHTML);
    },

    // Handle the displaying of calculations
    displayResult: function (value, isError) {
        document.querySelector('#result strong').innerHTML = value;

        // Change the style of the result box based on the error status
        if (isError) {
            document.getElementById('result').classList.replace('alert-primary', 'alert-danger');
        } else {
            document.getElementById('result').classList.replace('alert-danger', 'alert-primary');
        }

    },

    // Handle the moudule output (this is capturing all the stdout)
    wasmOutput: function (output) {
        _app.displayResult(output, false);
    },

    // Handle the moudule error output (this is capturing all the stderr)
    wasmOutputError: function (output) {
        _app.displayResult(output, true);
    }


};


// Start the app
_app.init();