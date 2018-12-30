Brackets Clientlibs Combine
===========================

Combine multiple clientlib files into one..

Here is an example of a 'clientlibs.combine' file:

```json
{
    "combineOnSave": false,
    "combine": [
        {
            "output": "resources/css/headlibs.min.css",
            "files": [
                "resources/thirdparty/bootstrap/css/bootstrap.min.css",
                "resources/thirdparty/bootstrap/themes/sb-admin-2/css/sb-admin-2.css",
                "resources/css/global.css"
            ]
        },
        {
            "output": "resources/js/headlibs.min.js",
            "files": [
                "resources/js/common.js",
                "resources/js/routes.js",
                "resources/js/filters.js",
                "resources/js/directives.js",
                "resources/js/factories/*.js",
                "resources/js/services/*.js",
                "resources/js/controllers/*.js"
            ]
        },
        {
            "output": "resources/js/bodylibs.min.js",
            "files": [
                "resources/thirdparty/bootstrap/js/bootstrap.min.js",
                "resources/thirdparty/bootstrap/themes/sb-admin-2/js/sb-admin-2.js"
            ]
        }
    ]
}
```

Right-click on `clientlibs.combine` to manually concatenate the files in the list, useful if `combineOnSave` is `false`.

**Wildcard Support**
* if the path to file ends with `/` character, all the files in that folder will be concatenated
* if the path to file ends with `/*` followed by a group of characters, only files ending in that group of characters will be concatenating (ex.: `controllers/*.js` matches all the files in controllers folder ending with `.js` i.e. all javascript files)

## Adobe Brackets Extension Registry
Search for `Brackets Clientlibs Combine` to locate and download latest version.

https://registry.brackets.io/
