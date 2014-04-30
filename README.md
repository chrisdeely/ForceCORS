ForceCORS
=============

ForceCORS is a Google Chrome extension which allows you to selectively apply CORS Headers to any web server responses
you choose. This is extremely helpful when developing a web application that makes Ajax/XHR requests.

The extension requires you to specify the domains that you wish to monitor and allows you to explicitly define the
headers to be added.  This is preferable to completely disabling XHR security in your browser, which is a big security
hole.

Installation
------------

To install the extension into Chrome (tested on version 20)

* Download the source, or checkout via git

        git clone https://github.com/chrisdeely/ForceCORS.git
* Open Chrome, hit the Settings Icon > Tools > Extensions
* Enable "Developer Mode" via the checkbox at the top
* Click the "Load unpacked extension" button and select the folder where you downloaded the code

Usage
-----
From the Extensions page, click the "Options" link below the ForceCORS entry.

* In the "Add URL" field, enter a base URL to which you would like to apply headers.
* Make sure to end the URL with "/*" to match all subdirectories
* Once a URL has been added, select it from the dropdown on the right to display the currently assigned headers (none yet)
* Hit the "Add Header" button to add a new header setting
* Supply both a header name and value and hit 'Save' for each
* Hit the 'Save All' button to update the extension settings
* 
Example : 
-----

*If you want to allow all your localhost files to be able to access the remote host www.xyz.com

 URL : http://xyz.com/* 

*Header: Access-Control-Allow-Origin

*Value : http://localhost/
