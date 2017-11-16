/*!
The MIT License (MIT)

Copyright (c) 2014 vyasrao

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
/*!
Modified work by: alister chan
Email: kitsingchan@gmail.com
Version: 2.0.1
*/

(function ($) {
    "use strict";

    $.fn.tautocomplete = function (options, callback) {
    	var settings = undefined;
        var old = $(this).data('plugin_tautocomplete');
    	
    	if(options === undefined) {
    		return old;
    	}
    	
        // default parameters
        settings = $.extend(true, {
            maxwidth: "500px",
            columns: [],
            hide: [false],
            onchange: null,
            onfocusout: null,
            norecord: "No Records Found",
            regex: ".",
            data: null,
            placeholder: null,
            theme: "abootstrap3",
            allthemes: { 'abootstrap3' : 
                               {
                                  textboxWrap: '<div class="form-group has-feedback"></div>',
                                  textboxFeedback: '<span class="form-control-feedback"></span>',
                                  textboxFeedbackIcon: '<i></i>',
                                  table: '<table class="table table-bordered table-hover"></table>', 
                                  startLoading: 'glyphicon glyphicon-refresh tautocomplete-glyphicon-spin', 
                                  endLoading: 'glyphicon glyphicon-flash' 
                                } 
                            },
            ajax: null,
            delay: 1000,
            highlight:'word-highlight',
        }, options);
        
        //Retrieve theme object
        var theme = settings.allthemes[settings.theme];
        
        // initialize DOM elements
        var el = {
            ddDiv: $("<div>", { "class": settings.theme }),
            ddTable: $(theme.table).css("max-width", settings.maxwidth),
            ddTableCaption: $("<caption>" + settings.norecord + "</caption>"),
            ddTextbox: $(this),
            ddTextboxWrap: $(theme.textboxWrap),
            ddTextboxFeedback: $(theme.textboxFeedback),
            ddTextboxFeedbackIcon: $(theme.textboxFeedbackIcon).addClass(theme.endLoading)
        };

        var keys = {
            UP: 38,
            DOWN: 40,
            ENTER: 13,
            TAB: 9,
            BACKSPACE: 8,
            SHIFT: 16
        };

        var errors = {
            columnNA: "Error: Columns Not Defined",
            dataNA: "Error: Data Not Available"
        };
        
        // plugin properties
        var tautocomplete = {
            id: function () {
                return el.ddTextbox.data("id");
            },
            text: function () {
                return el.ddTextbox.data("text");
            },
            searchdata: function () {
                return el.ddTextbox.val();
            },
            settext: function (text) {
                el.ddTextbox.val(text);
            },
            isNull: function () {
                if (el.ddTextbox.data("text") == "" || el.ddTextbox.data("text") == null)
                    return true;
                else
                    return false;
            },
            all: function(){
                return selectedData;
            },
            on: function() {
            	el.ddTextbox.data('autocomplete', 'on');
            },
            off: function() {
            	el.ddTextbox.data('autocomplete', 'off');
            },
            hidedropdown: function() {
            	hideDropDown();
            },
            showdropdown: function() {
            	showDropDown();
            },
            destroy: function() {
                //Unbind all related events
                el.ddTextbox.off('.tautocomplete');
                $(window).off('.tautocomplete');
                //Remove autocomplete, text, id
            	el.ddTextbox.data('autocomplete', null);
            	el.ddTextbox.data('timer', null);
            	el.ddTextbox.data('text', null);
            	el.ddTextbox.data('id', null);
            	//Remove the feedback icon
            	el.ddTextboxFeedbackIcon.remove();
            	el.ddTextboxFeedback.remove();
            	//Unwrap ddTextboxWrap, .acontainer
            	el.ddTextbox.unwrap().unwrap();
            	//Remove the div dropdown
            	el.ddDiv.remove();
            	$(this).data('plugin_tautocomplete', null);
            }
        };
        
        var escapeRegExp = function(regExp) {
           return regExp.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
        };

        // delay function which listens to the textbox entry
        var delay = (function () {
            return function (callsback, ms) {
                return setTimeout(callsback, ms);
            };
        })();

        // key/value containing data of the selcted row
        var selectedData = [];

        // get number of columns
        var cols = settings.columns.length;
        
        // destroy old plugin
        if(old !== undefined) {
            old.destroy();
        }

        // wrap textbox
        el.ddTextbox.wrap(el.ddTextboxWrap);
        
        el.ddTextboxWrap = el.ddTextbox.parent();
        
        //wrap textbox feedback icon
        //add class to textbox feedback
        el.ddTextboxFeedback.append(el.ddTextboxFeedbackIcon);
        
        //insert textbox feedback
        el.ddTextboxWrap.append(el.ddTextboxFeedback);
        
        // wrap the div for style
        el.ddTextboxWrap.wrap("<div class='acontainer'></div>");

        el.ddTextbox.data("autocomplete", "on");
        el.ddTextbox.data("timer", 0);
        el.ddTextbox.attr("placeholder", settings.placeholder);

        // check for mandatory parameters
        if (settings.columns == "" || settings.columns == null) {
            el.ddTextbox.attr("placeholder", errors.columnNA);
        }
        else if ((settings.data == "" || settings.data == null) && settings.ajax == null) {
            el.ddTextbox.attr("placeholder", errors.dataNA);
        }
        
        // append div after the textbox wrap
        el.ddTextboxWrap.after(el.ddDiv);

        // insert table at the end of div
        el.ddDiv.append(el.ddTable);
        el.ddTable.attr("cellspacing", "0");

        // insert table caption
        el.ddTable.append(el.ddTableCaption);

        // create table columns
        var header = "<thead><tr>";
        for (var i = 0; i <= cols - 1; i++) {
            header = header + "<th>" + settings.columns[i] + "</th>"
        }
        header = header + "</thead></tr>"
        el.ddTable.append(header);

        // event handlers

        // autocomplete key press
        el.ddTextbox.on('keyup.tautocomplete', function (e) {
            var timer = 0;
            
            if(el.ddTextbox.data("autocomplete") == "off") {
                return;
            }
            
            //Clear timer first
            clearTimeout(el.ddTextbox.data("timer"));
            
            //return if up/down/return key
            if ((e.keyCode < 46 || (e.keyCode > 111 && e.keyCode < 186)) && (e.keyCode != keys.BACKSPACE) && (e.keyCode != keys.SHIFT)) {
                e.preventDefault();
                return;
            }
            
            //delay for 1 second: wait for user to finish typing
            timer = delay(function () {
                processInput();
            }, settings.delay);
            el.ddTextbox.data("timer", timer);
        });

        // process input
        function processInput()
        {
            if (el.ddTextbox.val() == "") {
                    hideDropDown();
                    return;
            }

            // hide no record found message
            el.ddTableCaption.hide();

            el.ddTextboxFeedbackIcon.removeClass(theme.endLoading).addClass(theme.startLoading);

            if (settings.ajax != null)
            {
                var tempData = null;
                if ($.isFunction(settings.ajax.data)) {
                    tempData = settings.ajax.data.call(this);
                }
                else{
                    tempData = settings.ajax.data;
                }
                // get json data
                $.ajax({
                    type: settings.ajax.type || 'GET',
                    dataType: 'json',
                    contentType: settings.ajax.contentType || 'application/json; charset=utf-8',
                    headers: settings.ajax.headers || { 'Content-Type': 'application/x-www-form-urlencoded' },
                    data: tempData || null,
                    url: settings.ajax.url,
                    success: ajaxData,
                    error: function (xhr, ajaxOptions, thrownError) {
                        el.ddTextboxFeedbackIcon.removeClass(theme.startLoading).addClass(theme.endLoading);
                        alert('Error: ' + xhr.status || ' - ' || thrownError);
                    }
                });
            }
            else if ($.isFunction(settings.data)) {
                var data = settings.data.call(this);
                jsonParser(data);
            }
            else {
                // default function
                null;
            }
        }

        // call on Ajax success
        function ajaxData(jsonData)
        {
            if (settings.ajax.success == null || settings.ajax.success == "" || (typeof settings.ajax.success === "undefined"))
            {
                jsonParser(jsonData);
            }
            else {
                if ($.isFunction(settings.ajax.success)) {
                    var data = settings.ajax.success.call(this, jsonData);
                    jsonParser(data);
                }
            }
        }

        // do not allow special characters
        el.ddTextbox.on('keypress.tautocomplete', function (event) {
            var regex = new RegExp(settings.regex);
            var key = String.fromCharCode(!event.charCode ? event.which : event.charCode);

            if (!regex.test(key)) {
                event.preventDefault();
                return false;
            }
        });

        // textbox keypress events (return key, up and down arrow)
        el.ddTextbox.on('keydown.tautocomplete', function (e) {

            var tbody = el.ddTable.find("tbody");
            var selected = tbody.find(".active");

            if (e.keyCode == keys.ENTER) {
                e.preventDefault();
                select();
            }
            if (e.keyCode == keys.UP) {
                el.ddTable.find(".active").removeClass("active");
                if (selected.prev().length == 0) {
                    tbody.find("tr:last").addClass("active");
                } else {
                    selected.prev().addClass("active");
                }
            }
            if (e.keyCode == keys.DOWN) {
                tbody.find(".active").removeClass("active");
                if (selected.next().length == 0) {
                    tbody.find("tr:first").addClass("active");
                } else {
                    el.ddTable.find(".active").removeClass("active");
                    selected.next().addClass("active");
                }
            }
        });

        // row click event
        el.ddTable.delegate("tr", "mousedown", function () {
            el.ddTable.find(".active").removeClass("active");
            $(this).addClass("active");
            select();
        });

        // textbox blur event
        el.ddTextbox.on('focusout.tautocomplete', function () {
            // onfocusout callback function
            if ($.isFunction(settings.onfocusout)) {
                settings.onfocusout.call(this);
            }
            else {
            	hideDropDown();
            }
        });
        
        //Responsive to the browser window resize
        $(window).on('resize.tautocomplete', function() {
            if(el.ddDiv.hasClass("tautocomplete-highlight")) {
                hideDropDown();
                showDropDown();
            }
        });

        function select() {

            var selected = el.ddTable.find("tbody").find(".active");

            el.ddTextbox.data("id", selected.find('td').eq(0).text());
            el.ddTextbox.data("text", selected.find('td').eq(1).text());

            for(var i=0; i < cols; i++)
            {
                selectedData[i] = selected.find('td').eq(i).text();
            }
            
            el.ddTextbox.val(selected.find('td').eq(1).text());
            hideDropDown();
            onChange();
            el.ddTextbox.focus();
        }

        function onChange()
        {
            // onchange callback function
            if ($.isFunction(settings.onchange)) {
                settings.onchange.call(this);
            }
            else {
                // default function for onchange
            }
        }

        function hideDropDown() {
            el.ddTable.hide();
            el.ddTextbox.removeClass("inputfocus");
            el.ddDiv.removeClass("tautocomplete-highlight");
            el.ddTableCaption.hide();
        }

        function showDropDown() {

            var cssTop = (el.ddTextbox.outerHeight()) + "px 0px 0px 0px";

            //The table must be shown first, if not in IE11, the position of the textbox wrap would be incorrect
            el.ddTable.show();
            
            // reset div top, left and margin
            el.ddDiv.css("top", el.ddTextboxWrap.position().top);
            el.ddDiv.css("left", el.ddTextboxWrap.position().left);
            el.ddTable.css("margin", cssTop);

            el.ddDiv.addClass("tautocomplete-highlight");
            //el.ddTable.show();

        }
        function jsonParser(jsonData) {
            try{
                el.ddTextboxFeedbackIcon.removeClass(theme.startLoading).addClass(theme.endLoading);

                // remove all rows from the table
                el.ddTable.find("tbody").find("tr").remove();

                // regular expression for word highlight
                var re = null;
                if(settings.highlight != null){
                    var highlight = true;
                    var re = new RegExp(escapeRegExp(el.ddTextbox.val()),"gi");
                }

                var i = 0, j = 0;
                var row = null, cell = null;
                if (jsonData != null) {
                    for (i = 0; i < jsonData.length; i++) {

                        // display only 15 rows of data
                        if (i >= 15)
                            continue;

                        var obj = jsonData[i];
                        row = "";
                        j = 0;

                        for (var key in obj) {

                            // return on column count
                            if (j <= cols) {
                                cell = obj[key] + "";

                                if(highlight){
                                    cell = cell.replace(re,"<span class='" + settings.highlight + "'>$&</span>");
                                }
                                row = row + "<td>" + cell + "</td>";
                            }
                            else {
                                continue;
                            }
                            j++;
                        }
                        // append row to the table
                        el.ddTable.append("<tr>" + row + "</tr>");
                    }
                }
                // show no records exists
                if (i == 0)
                    el.ddTableCaption.show();

                // hide columns
                for(var i=0; (i< settings.hide.length) && (i< cols) ; i++)
                {
                    if(!settings.hide[i]) {
                        el.ddTable.find('td:nth-child('+ (i+1) +')').hide();
                        el.ddTable.find('th:nth-child('+ (i+1) +')').hide();
                    }
                }

                el.ddTable.find("tbody").find("tr:first").addClass('active');
                hideDropDown();
                
                if(el.ddTextbox.is(':focus')) {
                	showDropDown();
                }
            }
            catch (e)
            {
                alert("Error: " + e);
            }
        }
        
        $(this).data('plugin_tautocomplete', tautocomplete);
        
        return tautocomplete;
    };
}(jQuery));
