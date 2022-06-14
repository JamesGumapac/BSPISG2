/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

 define(['N/search', 'N/record', './lodash.min.js', 'N/task', 'N/format', 'N/xml'], function (search, record, lodash, task, format, xmlMod) {
    
    const API_CONSTANTS = Object.freeze({
        successCode: 200,
        loginAction: "http://tempuri.org/IAuthenticationService/Login",
        getOrdersAction: "http://tempuri.org/IOrdersService/GetOrdersReadyForThirdParty"
    });

     /**
     * Returns Integration server constants
     * @returns 
     */
      function serverConstants(){
        return API_CONSTANTS;
    }

    /**
     * Check for Empty value
     * @param {*} value 
     * @returns 
    */
	function isEmpty(value) {
		return (
			value === "" ||
			value == null ||
			value == undefined ||
			value == "null" ||
			value == "undefined" ||
			(value.constructor === Array && value.length == 0) ||
			(value.constructor === Object &&
				(function (v) {
					for (let k in v) return false;
					return true;
				})(value))
		);
	}

    /**
     * Return AQ Integration settings
     * @param {*} settingRecID 
     * @returns 
    */
    function getIntegrationSettings(settingRecID) {

    }


    function xmlToJson(xmlNode) {
       // Create the return object
        let obj = Object.create(null);

        if (xmlNode.nodeType == xmlMod.NodeType.ELEMENT_NODE) { // element
        // do attributes
            if (xmlNode.hasAttributes()) {
                obj['@attributes'] = Object.create(null);
                for (let j in xmlNode.attributes) {
                    if(xmlNode.hasAttribute({name : j})){
                        obj['@attributes'][j] = xmlNode.getAttribute({
                            name : j
                        });
                    }
                }
            }
        } else if (xmlNode.nodeType == xmlMod.NodeType.TEXT_NODE) { // text
            obj = xmlNode.nodeValue;
        }

        // do children
        if (xmlNode.hasChildNodes()) {
            for (let i = 0, childLen = xmlNode.childNodes.length; i < childLen; i++) {
                let childItem = xmlNode.childNodes[i];
                let nodeName = childItem.nodeName;
                if (nodeName in obj) {
                    if (!Array.isArray(obj[nodeName])) {
                        obj[nodeName] = [
                            obj[nodeName]
                        ];
                    }
                    obj[nodeName].push(xmlToJson(childItem));
                } else {
                    obj[nodeName] = xmlToJson(childItem);
                }
            }
        }

        return obj;
    }

    /**
     * Narrow down the JSON converted object to retrieve the Order list
     * @param {*} jsonObj 
     * @returns 
     */
    function getOrdersAttributeFromJSON(jsonObj){
        return jsonObj["s:Body"].GetOrdersReadyForThirdPartyResponse.GetOrdersReadyForThirdPartyResult["a:List"];
    }
    
    return {
        serverConstants: serverConstants,
        isEmpty:isEmpty,
        getIntegrationSettings: getIntegrationSettings,
        xmlToJson:xmlToJson,
        getOrdersAttributeFromJSON: getOrdersAttributeFromJSON
	};
});
