var currentSettings;

function retrieveSettings() {
    var siteSettings = localStorage['corsSites'];

    if (!siteSettings) {
        return null;
    }

    return JSON.parse(siteSettings);
}

function storeSettings(settings) {
    localStorage['corsSites'] = JSON.stringify(settings);
}

function populateHeadersTable(item, tableBody) {
    if (!item)
        return;

    if (!item.headers)
        return;

    tableBody.empty();

    // creates a click handler to turn on editing of the cell.
    // Requires a reference to the header data and a property name to bind to
    var clickFunctionGenerator = function (header, prop) {
        return function (event) {

            var target = $(event.target),
                input = $('<input type="text"/>').val($(event.target).text()),
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
            input.bind('enter', saveFunc);

            target.html(input).append(saveBtn);
        }
    };


    for (var i = 0, l = item.headers.length; i < l; i++) {
        var header = item.headers[i],
            tr = $('<tr></tr>'),
            name = $('<td></td>').text(header.name),
            value = $('<td></td>').text(header.value);

        //bind the click event on each of the fields to make them editable
        name.bind('click', clickFunctionGenerator(header, 'name'));
        value.bind('click', clickFunctionGenerator(header, 'value'));

        tr.append(name);
        tr.append(value);
        tableBody.append(tr);
    }

}

$(document).ready(function () {
    //check localStorage for any existing URL settings
    currentSettings = retrieveSettings() || [
        {
            URL:"http://*/*",
            headers:[
                {
                    name:"Access-Control-Allow-Origin",
                    value:"*"
                },
                {
                    name:"Access-Control-Allow-Headers",
                    value:"token"
                }
            ]
        },
        {
            URL:"https://*/*",
            headers:[
                {
                    name:"Access-Control-Allow-Origin",
                    value:"yo"
                },
                {
                    name:"Access-Control-Allow-Headers",
                    value:"sup"
                }
            ]
        }
    ];

    //initialize the URL selector
    var urlSelect = $('#activeURL');

    //populate select with all currently tracked URLs
    for (var i = 0, l = currentSettings.length; i < l; i++) {

        var item = $('<option></option>').attr('value', i).text(currentSettings[i].URL);
        if (i == 0) {
            item.attr("selected");
        }

        urlSelect.append(item);
    }

    urlSelect.bind('change', urlSelectionChanged);
    //initialize to the first item
    urlSelect.change();

    //allow user to add new URLs to manage
    var addURLForm = $('#addNewURLForm');
    addURLForm.bind('submit', function () {
        //create the new, blank rule set
        currentSettings.push(
            {
                URL:$('#newURL').val(),
                headers:[]
            });

        //add a new option to the select
        urlSelect.append( $('<option></option>').attr('value', currentSettings.length-1).text(currentSettings[currentSettings.length-1].URL));

        //make the new option selected
        urlSelect.find('option:selected').attr('selected', false);
        urlSelect.find('option').last().attr('selected',true);

        //trigger the change handler
        urlSelect.change();
    });



});

function urlSelectionChanged(event) {
    var item = currentSettings[ $(event.target).find('option:selected').index() ];
    populateHeadersTable(item, $('#headersTable tbody'));
}