/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

 define(['./bsp_isg_lb_utils.js', './bsp_isg_lb_service_api.js'], function (BSPLBUtils, BSPLBServiceAPI) {

    /**
     * Get Vendors from Logicblock API
     * @param {*} settings
     * @param {*} loginData  
     * @returns 
     */
    function getVendors(settings, loginData){
        let lbVendorsResultObj = {};

        let serviceURL = settings.custrecord_bsp_lb_catalog_service_url;
        let soapGetVendorsAction = settings.custrecord_bsp_lb_get_vend_soap_action;

        let requestBodyXML = getVendorsXMLStrRequest(loginData);
        let logicBlockServerResponse = BSPLBServiceAPI.runService(serviceURL, requestBodyXML, soapGetVendorsAction);

        let lbVendorsResult = null;
        if(!BSPLBUtils.isEmpty(logicBlockServerResponse)){
            lbVendorsResult = logicBlockServerResponse.FindAllVendorsResponse.FindAllVendorsResult.Vendor;           
            lbVendorsResultObj.lbVendors = lbVendorsResult;
        }else{
            lbVendorsResultObj.lbVendors = null;
            lbVendorsResultObj.error = logicBlockServerResponse;
            lbVendorsResultObj.errorMessage = logicBlockServerResponse.body;
        }
        
        return lbVendorsResultObj;
    }

    /**
     * Body of Vendor Request
     * @param {*} loginData 
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
     * Get Items from Logicblock API
     * @param {*} settings 
     * @param {*} loginData 
     * @param {*} productsSKU 
     * @returns 
     */
    function getItems(settings, loginData, productsSKU){
        let lbProductsResultObj = {};

        let serviceURL = settings.custrecord_bsp_lb_catalog_service_url;
        let soapGetProductsAction = settings.custrecord_bsp_lb_get_prod_soap_action;

        let requestBodyXML = getProductsXMLStrRequest(loginData, productsSKU);
        let logicBlockServerResponse = BSPLBServiceAPI.runService(serviceURL, requestBodyXML, soapGetProductsAction);

        let lbProductsResult = null;
        if(!BSPLBUtils.isEmpty(logicBlockServerResponse)){
            lbProductsResult = logicBlockServerResponse.FindProductsBySkusResponse.FindProductsBySkusResult.Product;           
            lbProductsResultObj.lbProducts = lbProductsResult;
        }else{
            lbProductsResultObj.lbProducts = null;
            lbProductsResultObj.error = logicBlockServerResponse;
            lbProductsResultObj.errorMessage = logicBlockServerResponse.body;
        }
        
        return lbProductsResultObj;
    }

    /**
     * Body of Items Request
     * @param {*} loginData 
     * @param {*} productsSKU 
     * @returns 
     */
    function getProductsXMLStrRequest(loginData, productsSKU){

        let skus = ``;
        productsSKU.forEach(productSKU => {
            skus += `<arr:string>${productSKU}</arr:string>`
        });
        
        let xmlBodyRequest = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/" xmlns:log="http://schemas.datacontract.org/2004/07/Logicblock.Commerce.Domain" xmlns:arr="http://schemas.microsoft.com/2003/10/Serialization/Arrays">
        <soapenv:Header/>
        <soapenv:Body>
        <tem:FindProductsBySkus>
        <tem:token>
        <log:ApiId>${loginData.ApiId}</log:ApiId>
        <log:ExpirationDateUtc>${loginData.ExpirationDateUtc}</log:ExpirationDateUtc>
        <log:Id>${loginData.Id}</log:Id>
        <log:IsExpired>${loginData.IsExpired}</log:IsExpired>
        <log:TokenRejected>${loginData.TokenRejected}</log:TokenRejected>
        </tem:token>
        <tem:skus>
        ${skus}
        </tem:skus>
        </tem:FindProductsBySkus>
        </soapenv:Body>
        </soapenv:Envelope>`;

        return xmlBodyRequest;
    }

    return {
		getVendors: getVendors,
        getItems: getItems
	};

});