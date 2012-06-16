var currentSettings;

/**
 * Retrieves the saved settings from localstorage
 * @return an Array of Objects containing { URL:String, headers:[ {name:String, value:String} ] }
 */
function retrieveSettings() {
    var siteSettings = localStorage['corsSites'];

    if (!siteSettings) {
        return null;
    }

    return JSON.parse(siteSettings);
}

/**
 * Stores the provided settings in the extension's localstorage area
 * @param settings an Array of an Array of Objects containing { URL:String, headers:[ {name:String, value:String} ] }
 */
function storeSettings(settings) {
    localStorage['corsSites'] = JSON.stringify(settings);
}

/**
 * Displays the headers for the given item in the settings table
 * @param item an Object containing { URL:String, headers:[ {name:String, value:String} ] }
 * @param tableBody jQuery reference to the tbody tag where we will inject the header name/values
 */
function populateHeadersTable(item, tableBody) {

    tableBody.empty();

    if (!item)
        return;

    if (!item.headers)
        return;

    // creates a click handler to turn on editing of the cell.
    // Requires a reference to the header data and a property name to bind to
    var clickFunctionGenerator = function (header, prop) {
        return function (event) {

            var target = $(event.target),
                input = $('<input type="text"/>').val(target.text()),
                saveBtn = $('<button class="btn">Save</button>'),
                saveFunc = function () {
                    //remove event listeners
                    saveBtn.unbind();
                    input.unbind();

                    //capture the new value
                    header[prop] = $(input).val();

                    //return the field to the non-editing state
                    target.html(header[prop]);
                };


            saveBtn.bind('click', saveFunc);
            input.bind('keydown', function (e) {
                if (e.which == 13) saveFunc();
            });

            target.html(input).append(saveBtn);
            input.focus();
        }
    };

    /**
     * Creates a <tr> element for injection into the header settings table
     * @param header {Object} {name:String, value:String}
     * @return a jQuery reference to a <tr> node containing the header display
     */
    var generateHeaderTR = function (header) {
        var tr = $('<tr></tr>'),
            name = $('<td></td>').text(header.name),
            value = $('<td></td>').text(header.value);

        //bind the click event on each of the fields to make them editable
        name.bind('click', clickFunctionGenerator(header, 'name'));
        value.bind('click', clickFunctionGenerator(header, 'value'));

        tr.append(name);
        tr.append(value);
        return tr;
    };

    //iterate the headers and append each <tr>
    for (var i = 0, l = item.headers.length; i < l; i++) {
        tableBody.append(generateHeaderTR(item.headers[i]));
    }

    //When clicking the "add header" btn
    // add a new empty header setting to the array, and render the new entry
    var addHeaderBtn = $('.addHeader');
    addHeaderBtn.unbind();
    addHeaderBtn.bind('click', function () {
        item.headers.push({name:'', value:''});
        var tr = generateHeaderTR(item.headers[ item.headers.length - 1 ]);
        tableBody.append(tr);

        tr.find('td').first().click();
    });

}

/**
 * Handles the change event from the URL select box
 * @param event the jQuery event
 */
function urlSelectionChanged(event) {
    var item = currentSettings[ $(event.target).find('option:selected').index() ];
    populateHeadersTable(item, $('#headersTable tbody'));
}

function renderSelectOptions() {
//initialize the URL selector
    var urlSelect = $('#activeURL');
    urlSelect.unbind();
    urlSelect.empty();

    //populate select with all currently tracked URLs
    for (var i = 0, l = currentSettings.length; i < l; i++) {

        var item = $('<option></option>').attr('value', i).text(currentSettings[i].URL);
        if (i == 0) {
            item.attr("selected", "selected");
        }

        urlSelect.append(item);
    }

    urlSelect.bind('change', urlSelectionChanged);
    //initialize to the first item
    urlSelect.change();
    return urlSelect;
}

$(document).ready(function () {
    //check localStorage for any existing URL settings
    currentSettings = retrieveSettings() || [  ];

    var urlSelect = renderSelectOptions();

    //allow user to add new URLs to manage
    var addURLForm = $('#addNewURLForm');
    addURLForm.bind('submit', function () {
        //create the new, blank rule set
        var newRule = {
            URL:$('#newURL').val(),
            headers:[]
        };
        currentSettings.push(newRule);

        //add a new option to the select
        urlSelect.append($('<option></option>').attr('value', currentSettings.length - 1).text(newRule.URL));

        //make the new option selected
        urlSelect.find('option:selected').attr('selected', false);
        urlSelect.find('option').last().attr('selected', true);

        //trigger the change handler
        urlSelect.change();

        //clear the old text
        $('#newURL').val('');

        //add a header right away
        $('.addHeader').click();
    });

    //hide the alerts
    $('.alert').hide();

    //enable the save button
    var saveBtn = $('#saveAll');
    saveBtn.bind('click', storeAndAlert);

    //enable deleting all settings
    var delAll = $('#deleteAll');
    delAll.bind('click', function () {
        currentSettings = [];
        storeAndAlert();
        renderSelectOptions();
    });

    //enable deleting a single setting
    var delSel = $('#deleteSelected');
    delSel.bind('click',function(){
        var index = urlSelect.find('option:selected').val();
        currentSettings.splice(index,1);
        storeAndAlert();
        renderSelectOptions();
    });
});

/**
 * Stores the current settings and reports on success or failure to the UI
 */
function storeAndAlert() {

    try {
        storeSettings(currentSettings);

        chrome.extension.sendRequest('update', function(response){
            $('.alert-success').show();
            $('.alert-success').fadeOut(2500);
        });


    } catch (e) {
        $('.alert-error').text('An error occurred: ' + e.toString());
        $('.alert-error').show();
        $('.alert-error').fadeOut(5000);
    }
}

