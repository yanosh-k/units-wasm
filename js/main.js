var _app = {

    // Initialize the app functionality
    init: function () {
        _app.initCcall();
        _app.bind();
    },

    // Do all the event bindings for the app
    bind: function () {
        document.getElementById('main').addEventListener('submit', _app.onMainFormSubmit);
        document.getElementById('copy-result').addEventListener('click', _app.onCopyResultClick);
    },

    // Hide the loader once the runtime is initilized and a test call to
    // covnert_unit was made
    initCcall: function () {
        Module.onRuntimeInitialized = async _ => {
            // Do a first initial calculation, to speedup all subsequent calls
            var initValue = Module.ccall('convert_unit', 'string', ['string', 'string'], ['1inch', 'm']);

            document.getElementById('loader').classList.add('invisible');
        };
    },

    // Handle form calculations
    onMainFormSubmit: function (event) {
        var have = this['have-value'].value + ' ' + this['have-unit'].value;
        var result = '';

        try {
            result = Module.ccall('convert_unit', 'string', ['string', 'string'], [have, this['want-unit'].value]);
        } catch (e) {
            result = 'ERR';
        }

        document.querySelector('#result strong').innerHTML = result;
        event.preventDefault();
    },

    // Handle copy result button click
    onCopyResultClick: function () {
        navigator.clipboard.writeText(document.querySelector('#result strong').innerHTML);
    }

};


// Start the app
_app.init();