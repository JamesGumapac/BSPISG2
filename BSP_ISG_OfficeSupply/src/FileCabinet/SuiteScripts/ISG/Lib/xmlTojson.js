/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

 define(['N/xml'], function (xml) {
    
    /**
     * Parse XML object to JSON
     * @param {*} xmlNode 
     * @returns 
     */
    function xmlToJson(xmlNode) {
        xmlNode.normalize();
        let obj = Object.create(null);
        if (xmlNode.nodeType == xml.NodeType.ELEMENT_NODE) { // element
            if (xmlNode.hasAttributes()) {
                obj[xmlNode.nodeName] = Object.create(null);
                for (let j in xmlNode.attributes) {
                    if(xmlNode.hasAttribute({name : j})){
                        obj[xmlNode.nodeName][j] = xmlNode.getAttribute({
                            name : j
                        });
                    }
                }
            }
        } else if (xmlNode.nodeType == xml.NodeType.TEXT_NODE || xmlNode.nodeType == xml.NodeType.CDATA_SECTION_NODE) {
            obj = xmlNode.nodeValue;
        }
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
                    if (nodeName == '#text' || nodeName == '#cdata-section')
                    {
                        obj = xmlToJson(childItem);
                    }
                    else
                    {
                        obj[nodeName] = xmlToJson(childItem, nodeName);                      
                    }
                }
            }
        }
        return obj;
    };
    
    return {
        xmlToJson: xmlToJson
	};
});
