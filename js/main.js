var Module = {};
var _app = {

    // And instance of the storage handler, by default this is the LocalStorage.
    // If another storage handler is used, please maker sure that it has the same
    // API
    storageHandler: null,

    // Initialize the app functionality
    init: function () {
        _app.initModule();
        _app.bind();
        _app.initStorageHandler();
        _app.initConvertors();
    },

    // Do all the event bindings for the app
    bind: function () {
        document.getElementById('main').addEventListener('submit', _app.onMainFormSubmit);
        document.getElementById('create-convertor').addEventListener('submit', _app.onCreateConvertorFormSubmit);
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

    // Initialize the storage handler
    initStorageHandler: function () {
        _app.storageHandler = window.localStorage;
    },

    // Reload the displayed convertors
    initConvertors: function () {
        var convertorsList = _app.getConvertorsList();
        var convertorsHolder = document.getElementById('accordion-root');

        for (var convertorId in convertorsList) {
            var convertorName = convertorsList[convertorId].name;
            var youHave = convertorsList[convertorId].you_have;
            var youWant = convertorsList[convertorId].you_want;
            var youHaveUnit = youHave.replace(/\s*@X@\s*/g, '');
            var convertorHtml = `
            <div class="accordion-item">
                <h2 class="accordion-header" id="accordion-item-${convertorId}-header">
                    <button type="button" class="accordion-button collapsed" data-bs-toggle="collapse" data-bs-target="#accordion-item-${convertorId}-body">
                        ${convertorName}
                    </button>
                </h2>
                <div id="accordion-item-${convertorId}-body" class="accordion-collapse collapse" data-bs-parent="#accordion-root">
                    <div class="accordion-body">
                        <form class="convertor">
                            <div class="input-group">
                                <input type="hidden" class="you-have" value="${youHave}" />
                                <input type="hidden" class="you-want" value="${youWant}" />
                                <input type="text" autocapitalize="none" autocomplete="off" class="form-control you-have-value" />
                                <button type="button" class="btn btn-primary">Convert</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>`;

            convertorsHolder.insertAdjacentHTML('beforeend', convertorHtml);
        }


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

    // Handle saving of new convertors
    onCreateConvertorFormSubmit: function () {
        var modalInstance = new bootstrap.Modal(document.getElementById('add-convertor-modal'));
        var convertorsList = _app.getConvertorsList();

        // Add the new convertor
        convertorsList[_app.generateUniqId()] = {
            name: this['add-name'].value,
            you_have: this['add-you-have'].value,
            you_want: this['add-you-want'].value
        };

        // Save the updated convertors list
        _app.setConvertorsList(convertorsList);
        // Hide the modal
        modalInstance.toggle();
        // Remove the data from the form
        this.reset();
        // Reload the convertos 
        _app.initConvertors();

    },

    // Handle the displaying of calculations
    displayResult: function (value, isError) {
        document.querySelector('#result strong').innerHTML = value;
        _app.changeResultBoxToStatus(isError);
    },

    // Handle the chaning of the results box to an error box
    changeResultBoxToStatus: function (isError) {
        // Just toggle the class of the box based on the error value
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
    },

    // Generate a uniq identificator based on the current date
    generateUniqId: function () {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    // Get the sotred list of convertors
    getConvertorsList: function () {
        var existingConvertors = _app.storageHandler.getItem('convertors');

        // Initialize the convertos list
        if (existingConvertors === null) {
            existingConvertors = _app.getDefaultConvertorsList();
        } else {
            existingConvertors = JSON.parse(existingConvertors);
        }

        return existingConvertors;
    },

    // Set the stored list of convertors
    setConvertorsList: function (convertorsList) {
        _app.storageHandler.setItem('convertors', JSON.stringify(convertorsList));
    },

    // Create a list of default convertors to show when 
    // the app is lodaded for the first time
    getDefaultConvertorsList: function () {
        var defaultConvertors = {};

        // Inches to centimeters
        defaultConvertors[_app.generateUniqId()] = {
            name: "Inches to Centimeters",
            you_have: "@X@ inch",
            you_want: "cm"
        };

        // Miles to kilometers
        defaultConvertors[_app.generateUniqId()] = {
            name: "Miles to Kilometers",
            you_have: "@X@ mile",
            you_want: "km"
        };

        // Gallons to Litres
        defaultConvertors[_app.generateUniqId()] = {
            name: "Gallons to Litres",
            you_have: "@X@ gallon",
            you_want: "litre"
        };

        // Fahrenheit to Celsius temperature
        defaultConvertors[_app.generateUniqId()] = {
            name: "Fahrenheit to Celsius",
            you_have: "tempF(@X@)",
            you_want: "tempC"
        };

        return defaultConvertors;
    }


};


// Start the app
_app.init();