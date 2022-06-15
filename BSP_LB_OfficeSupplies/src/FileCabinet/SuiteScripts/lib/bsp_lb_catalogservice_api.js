/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

 define(['N/record', 'N/search', './bsp_lb_utils.js'], function (record, search, BSPLBUtils) {

    function getVendors(settings){
        let lbVendorsResultObj = {};

        let serviceURL = settings.custrecord_bsp_lb_catalog_service_url;
        let soapGetVendorsAction = settings.custrecord_bsp_lb_get_vend_soap_action;

        let loginData = BSPLBServiceAPI.login(settings);
        let requestBodyXML = getVendorsXMLStrRequest(loginData);

        log.debug("getVendors", {requestBodyXML});

        let logicBlockServerResponse = BSPLBServiceAPI.runService(serviceURL, requestBodyXML, soapGetVendorsAction);

        BSPLBUtils.createServiceLog(
            serviceURL, 
            soapGetVendorsAction, 
            requestBodyXML, 
            logicBlockServerResponse.code, 
            logicBlockServerResponse.headers, 
            (logicBlockServerResponse.body).substring(0, 100000)
        );

        let lbVendorsResult = null;
        if(logicBlockServerResponse.code && logicBlockServerResponse.code == BSPLBUtils.serverConstants().successCode){
            lbVendorsResult = parseVendorsResponseXml(logicBlockServerResponse.body);
            lbVendorsResultObj.lbVendors = lbVendorsResult.vendorsList;
        }else{
            lbVendorsResultObj.lbVendors = null;
            lbVendorsResultObj.error = logicBlockServerResponse;
            lbVendorsResultObj.errorMessage = logicBlockServerResponse.body;
        }

        return lbVendorsResultObj;
    }

    /**
     * Body of Vendor Request
     * @returns 
     */
     function getVendorsXMLStrRequest(loginData){
        return `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/" xmlns:log="http://schemas.datacontract.org/2004/07/Logicblock.Commerce.Domain">
                     <soapenv:Header/>
                     <soapenv:Body>
                        <tem:FindAllVendors>
                            <tem:token>
                                <log:ApiId>${loginData.ApiId}</log:ApiId>
                                <log:ExpirationDateUtc>${loginData.ExpirationDateUtc}</log:ExpirationDateUtc>
                                <log:Id>${loginData.Id}</log:Id>
                                <log:IsExpired>${loginData.IsExpired}</log:IsExpired>
                                <log:TokenRejected>${loginData.TokenRejected}</log:TokenRejected>
                            </tem:token>
                        </tem:FindAllVendors>
                    </soapenv:Body>
                </soapenv:Envelope>`;
    }


    /**
     * Parse XML response from Get Vendors request
     * @param {*} xmlStr 
     * @returns 
    */
    function parseVendorsResponseXml(xmlStr){
        let objVendorsResult = {};

        var xmlDocument = xml.Parser.fromString({
            text: xmlStr
        });

        let jsonObj = BSPLBUtils.xmlToJson(xmlDocument.documentElement);
        let vendorsList = [];
        vendorsList = BSPLBUtils.getVendorsAttributeFromJSON(jsonObj);
        let vendorsStr = JSON.stringify(vendorsList).replaceAll("a:","");
        vendorsStr = vendorsStr.replaceAll('"@attributes":{}',"");
        vendorsList = JSON.parse(vendorsStr);

        objVendorsResult = {
            vendorsList: vendorsList
        }
        return objVendorsResult;
    }

    return {
		getVendors: getVendors
	};

});