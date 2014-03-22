var currentSiteSettings;

/**
 * Retrieves the saved site definitions from localstorage
 * @return an Array of Objects containing { URL:String, headers:[ {name:String, value:String} ] }
 */
function retrieveSiteSettings() {
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
function storeSiteSettings(settings) {
    localStorage['corsSites'] = JSON.stringify(settings);
}

/**
 * Displays the headers for the given item in the settings table
 * @param item an Object containing { URL:String, headers:[ {name:String, value:String} ] }
 * @param tableBody jQuery reference to the tbody tag where we will inject the header name/values
 */
function populateHeadersTable(item, tableBody) {

    tableBody.empty();

    if (!item) return;

    if (!item.headers) return;

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
    var item = currentSiteSettings[ $(event.target).find('option:selected').index() ];
    populateHeadersTable(item, $('#headersTable').find('tbody'));
}

function renderSelectOptions() {
//initialize the URL selector
    var urlSelect = $('#activeURL');
    urlSelect.unbind();
    urlSelect.empty();

    //populate select with all currently tracked URLs
    for (var i = 0, l = currentSiteSettings.length; i < l; i++) {

        var item = $('<option></option>').attr('value', i).text(currentSiteSettings[i].URL);
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
    currentSiteSettings = retrieveSiteSettings() || [  ];

    var urlSelect = renderSelectOptions();

    //allow user to add new URLs to manage
    var addURLForm = $('#addNewURLForm');
    addURLForm.bind('submit', function () {
        //create the new, blank rule set
        var $input = $('#newURL'),
            newRule = {
                URL:$input.val(),
                headers:[]
            };
        currentSiteSettings.push(newRule);

        //add a new option to the select
        urlSelect.append($('<option></option>').attr('value', currentSiteSettings.length - 1).text(newRule.URL));

        //make the new option selected
        urlSelect.find('option').attr('selected', false).last().attr('selected', true);

        //trigger the change handler
        urlSelect.change();

        //clear the old text
       $input.val('');

        //add a header right away
        $('.addHeader').click();

        return false;
    });

    //hide the alerts
    $('.alert').hide();

    //check to see if user wants to display intercept count
    var displayCountCB = $('#displayCount'),
        displayCount = localStorage['displayInterceptCount'];

        try {
         displayCount = JSON.parse( displayCount );   
        }catch(e){
         displayCount = true;   
        }
        
        displayCountCB.attr('checked', displayCount ? 'checked' : null);

    //enable the save button
    var saveBtn = $('#saveAll');
    saveBtn.bind('click', storeAndAlert);

    //enable deleting all settings
    var delAll = $('#deleteAll');
    delAll.bind('click', function () {
        currentSiteSettings = [];
        storeAndAlert();
        renderSelectOptions();
    });

    //enable deleting a single setting
    var delSel = $('#deleteSelected');
    delSel.bind('click',function(){
        var index = urlSelect.find('option:selected').val();
        currentSiteSettings.splice(index,1);
        storeAndAlert();
        renderSelectOptions();
    });
    
    //import/export
    var exportModal = $('#exportModal');
    exportModal.on('show',function(){
        var modal = $(this),
            ta = modal.find('textarea'),
            cg = modal.find('.control-group'),
            submit = modal.find('.btn-primary'),
            errMsg = modal.find('.help-inline');

        ta.text(FormatJSON(currentSiteSettings));

        submit.bind('click', function(){
            cg.removeClass('error');
            errMsg.hide();

            require(['validate','dataSchema'],function(validate, schema){
                try {
                    var value = JSON.parse(ta.val());
                    var validation = validate(value, schema);

                    if(validation.valid){
                        currentSiteSettings = value;
                        modal.modal('hide');
                        storeAndAlert();
                    }else{
                        var msg = "Encountered errors parsing your JSON:<ul>";
                        for(var i=0,l=validation.errors.length;i<l;i++){
                            msg += "<li>" + validation.errors[i].property +" "+validation.errors[i].message +"</li>";
                        }
                        msg += "</ul>";

                        errMsg.html(msg);
                        errMsg.show();
                        cg.addClass('error');
                    }
                }catch(e){
                    errMsg.text('Unable to parse the input as JSON: '+e.toString());
                    errMsg.show();
                    cg.addClass('error');
                }
            });

        })
    }).on('hide',function(){
        var modal = $(this),
            submit = modal.find('.btn-primary');
        submit.unbind();
    })
});

/**
 * Stores the current settings and reports on success or failure to the UI
 */
function storeAndAlert() {
    var successAlert = $('.alert-success'),
        errorAlert = $('.alert-error');
    try {
        storeSiteSettings(currentSiteSettings);
        localStorage['displayInterceptCount'] = $('#displayCount').attr('checked') === 'checked';

        chrome.extension.sendRequest('update', function(){
            renderSelectOptions();
            successAlert.show();
            successAlert.fadeOut(2500);
        });


    } catch (e) {
        errorAlert.text('An error occurred: ' + e.toString());
        errorAlert.show();
        errorAlert.fadeOut(5000);
    }
}

