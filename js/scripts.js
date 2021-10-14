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
        _app.initConvertorsSorting();
    },

    // Do all the event bindings for the app
    bind: function () {
        document.getElementById('main').addEventListener('submit', _app.onMainFormSubmit);
        document.getElementById('create-convertor').addEventListener('submit', _app.onCreateConvertorFormSubmit);
        document.getElementById('accordion-root').addEventListener('submit', function (event) {
            if (event.target.classList.contains('convertor')) {
                _app.onConvertorFormSubmit.apply(event.target, [event]);
            }
        });
        document.body.addEventListener('click', function (event) {
            if (event.target.classList.contains('btn-clear-content')) {
                _app.onClearButtonClick.apply(event.target, [event]);
            }

            if (event.target.classList.contains('btn-remove-convertor')) {
                _app.onRemoveConvertorButtonClick.apply(event.target, [event]);
            }
        });
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
        var convertorsHolder = document.getElementById('convertors-holder');
        var activeConvertors = document.querySelectorAll('.accordion-item-convertor');

        // Remove the old covnertors from the html
        for (var i = 0; i < activeConvertors.length; i++) {
            activeConvertors[i].remove();
        }

        // Add the convertors to the html
        for (var convertorId in convertorsList) {
            var convertorName = _app.escapeHtml(convertorsList[convertorId].name);
            var youHave = _app.escapeHtml(convertorsList[convertorId].you_have);
            var youWant = _app.escapeHtml(convertorsList[convertorId].you_want);
            var convertorHtml = `
            <div id="accordion-item-${convertorId}" class="accordion-item accordion-item-convertor" data-convertor-id="${convertorId}">
                <h2 class="accordion-header" id="accordion-item-${convertorId}-header">
                    <button type="button" class="accordion-button collapsed" data-bs-toggle="collapse" data-bs-target="#accordion-item-${convertorId}-body">
                        <span class="text-muted me-3 d-inline-block fs-1 sort-handle">&equiv;</span> ${convertorName}
                    </button>
                </h2>
                <div id="accordion-item-${convertorId}-body" class="accordion-collapse collapse" data-bs-parent="#accordion-root">
                    <div class="accordion-body">
                        <form class="convertor">
                            <input type="hidden" class="you-have" value="${youHave}" />
                            <input type="hidden" class="you-want" value="${youWant}" />
                            <div class="input-group mb-3">
                                <input type="text" autocapitalize="none" autocomplete="off" id="you-have-value-${convertorId}" class="form-control you-have-value" />
                                <button type="button" class="btn btn-outline-secondary btn-clear-content" data-target="#you-have-value-${convertorId}">Clear</button>
                            </div>
                            <div class="d-flex justify-content-between">
                                <div class="dropdown">
                                  <button class="btn btn-outline-primary dropdown-toggle" type="button" data-bs-toggle="dropdown">
                                    Options
                                  </button>
                                  <ul class="dropdown-menu">
                                    <li><button type="button" class="btn-remove-convertor dropdown-item text-danger" data-target="#accordion-item-${convertorId}">Remove</button></li>
                                  </ul>
                                </div>
                                <button type="submit" class="btn btn-primary">Convert</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>`;

            convertorsHolder.insertAdjacentHTML('beforeend', convertorHtml);
        }
    },

    // Intialize the sorting library for the convertors and the saving logic
    initConvertorsSorting: function () {
        var sortingRoot = document.getElementById('convertors-holder');

        new Sortable(sortingRoot, {
            handle: '.sort-handle',
            draggable: '.accordion-item',
            dataIdAttr: 'data-convertor-id',
            store: {
                get: function () {
                    var convertorsList = _app.getConvertorsList();
                    var order = [];

                    // String keys, in insertion order (ES2015 guarantees this and all browsers comply),
                    // are preserved for object properties
                    for (var convertorId in convertorsList) {
                        order.push(convertorId);
                    }

                    return order;
                },
                set: function (sortable) {
                    // Load the sorted ids
                    var sortedIds = sortable.toArray();
                    // Load the data for the ids
                    var convertorsList = _app.getConvertorsList();
                    // Init a new sorted object for the convertors
                    var orderedConvertorsList = {};


                    // Create a new object with the new items order
                    for (var i = 0; i < sortedIds.length; i++) {
                        orderedConvertorsList[sortedIds[i]] = convertorsList[sortedIds[i]];
                    }

                    _app.setConvertorsList(orderedConvertorsList);
                }
            }
        });
    },

    // Handle clearing of input fields
    onClearButtonClick: function () {
        var targetElements = document.querySelectorAll(this.dataset.target);
        for (var i = 0; i < targetElements.length; i++) {
            if (targetElements[i].tagName.toLowerCase() === 'input') {
                targetElements[i].value = '';
            } else {
                targetElements[i].innerHTML = '';
            }
        }
    },

    // Hanld convertors submission
    onConvertorFormSubmit: function (event) {
        event.preventDefault();
        var youHaveValue = this.querySelector('.you-have-value').value;
        var youHave = this.querySelector('.you-have').value.replace(/@X@/g, youHaveValue);
        var youWant = this.querySelector('.you-want').value;

        // Clear the result box
        _app.displayResult('', false, true);

        // Make the calculation
        Module.ccall('convert_unit', 'string', ['string', 'string'], [youHave, youWant]);
    },

    // Handle runtime initilization event
    onRuntimeInit: function () {
        // Hide the preloader once the module intializes
        document.getElementById('loader').classList.add('invisible');
    },

    // Handle form calculations
    onMainFormSubmit: function (event) {
        event.preventDefault();

        // Clear the result box
        _app.displayResult('', false, true);

        // Make the calculation
        Module.ccall('convert_unit', 'string', ['string', 'string'], [this['you-have'].value, this['you-want'].value]);
    },

    // Handle copy result button click
    onCopyResultClick: function () {
        var dataToCopy = document.querySelector('#result-value-holder').innerHTML;

        if (typeof cordova === 'undefined') {
            navigator.clipboard.writeText(dataToCopy);
        } else {
            cordova.plugins.clipboard.copy(dataToCopy);
        }
    },

    // Handle saving of new convertors
    onCreateConvertorFormSubmit: function (event) {
        event.preventDefault();
        var modalInstance = document.getElementById('add-convertor-modal');
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
        modalInstance.querySelector('.btn-close').dispatchEvent(new Event('click'));
        // Remove the data from the form
        this.reset();
        // Reload the convertors 
        _app.initConvertors();

    },

    // Handle the removing of a convertor
    onRemoveConvertorButtonClick: function (event) {
        event.preventDefault();
        var confirmationMessage = 'Are you sure you would like to delete this item? This cannot be undone.';

        // Handle browser confirmation
        if (typeof navigator.notification === 'undefined') {
            // If the user does not confirm, just stop the function exection
            if (!confirm(confirmationMessage)) {
                return;
            }
            _app.handleRemoveConvertorConfirmation(event.target);
        } else {
            // Handle native app notification
            navigator.notification.confirm(confirmationMessage, function (buttonIndex) {
                if (buttonIndex === 1) {
                    _app.handleRemoveConvertorConfirmation(event.target);
                }
            });
        }
    },

    // Called when a deletion confirmation is made
    handleRemoveConvertorConfirmation: function (removeBtn) {
        var targetForRemoving = document.querySelector(removeBtn.dataset.target);
        var convertorsList = _app.getConvertorsList();

        // Remove the element from memory and html
        delete convertorsList[targetForRemoving.dataset.convertorId];
        _app.setConvertorsList(convertorsList);
        targetForRemoving.remove();
    },

    // Handle the displaying of calculations
    displayResult: function (value, isError, doClear) {
        var strippedOtuput = value.replace(/^\t\*\s/, '').replace(/^\s+Definition:\s/, '');

        if (doClear) {
            document.querySelector('#result strong').innerHTML = strippedOtuput;
        } else {
            document.querySelector('#result strong').innerHTML += strippedOtuput;
        }

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

        // Initialize the convertors list
        if (existingConvertors === null) {
            existingConvertors = _app.getDefaultConvertorsList();
            _app.setConvertorsList(existingConvertors);
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
    },

    // encode HTML special characters
    escapeHtml: function (unsafe) {
        return unsafe
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
    }


};


// Start the app
_app.init();