/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
 define([
    'N/record', 
    'N/search', 
    '../Lib/bsp_isg_as2_service.js', 
    '../Lib/bsp_isg_trading_partners.js', 
    '../Lib/bsp_isg_transmitions_util.js',
    '../Lib/bsp_isg_purchase_orders.js'],
 /**
 * @param{record} record
 * @param{search} search
 * @param{BSP_AS2Service} BSP_AS2Service
 * @param{BSPTradingParnters} BSPTradingParnters
 * @param{BSPTransmitionsUtil} BSPTransmitionsUtil
 * @param{BSP_POutil} BSP_POutil
 */
 (record, search, BSP_AS2Service, BSPTradingParnters, BSPTransmitionsUtil, BSP_POutil) => {

    /**
     * Defines the function that is executed when a POST request is sent to a RESTlet.
     * @param {string | Object} requestBody - The HTTP request body; request body is passed as a string when request
     *     Content-Type is 'text/plain' or parsed into an Object when request Content-Type is 'application/json' (in which case
     *     the body must be a valid JSON)
     * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 'text/plain'; returns an
     *     Object when request Content-Type is 'application/json' or 'application/xml'
     * @since 2015.2
    */
    const post = (requestBody) => {
         let functionName = "POST";
         let response = null;
         try{
             log.debug(functionName, `Request Body:  ${JSON.stringify(requestBody)}`);
             let decodedXMLresponse = BSP_AS2Service.decodeStringContent(requestBody.Payload.Content);

             let jsonObjResponse = BSP_AS2Service.parseResponseXml(decodedXMLresponse);  
             log.debug(functionName, `${JSON.stringify(jsonObjResponse)}`);  
                    
             if(isPOAcknowledgment(jsonObjResponse)){
                /**
                 * Check Trading partner Origin
                */
                let result = null;
                if(isAcknowledgmentSPR(jsonObjResponse)){
                    result = BSPTradingParnters.processPOAck(jsonObjResponse, BSPTradingParnters.constants().spr);
                }else if(isAcknowledgmentEssendant(jsonObjResponse)){
                    result = BSPTradingParnters.processPOAck(jsonObjResponse, BSPTradingParnters.constants().essendant);
                }
                
                /**
                 * Check Transmission Queue for automatic PO Transmissions
                */
                if(result && result.queueID){
                    BSPTransmitionsUtil.checkTransmissionQueue(result.queueID);
                }
              
                /**
                 * Update Transmission Status for Manual POs
                */
                if(result && !result.queueID && result.status == "Error"){
                    BSP_POutil.updatePOtransmissionStatus(result.poID, BSP_POutil.transmitionPOStatus().acknowledgmentFailed);
                    log.debug(functionName, `Error in Manual PO Acknowledgment`);
                }

             }else if(isInvoice(jsonObjResponse)){
                if(isInvoiceSPR(jsonObjResponse)){
                    log.debug(functionName, `This is an Invoice from SPR`);

                }else if(isInvoiceEssendant(jsonObjResponse)){
                    log.debug(functionName, `This is an Invoice from Essendant`);
                    
                }        
             }

             response = {
                 "operation_code": "200",
                 "operation_message": "OK",
             };
         }catch(error){
             log.error(functionName, `Error: ${error.toString()}`);
             response = {
                 "operation_code": "500",
                 "operation_message": "Internal error occured",
             };
         } 
         return response;
    }

    const isPOAcknowledgment = (jsonObjResponse) => {

        /**
         * Check for SPR
        */
        let orderSPR = jsonObjResponse.Order;
        if(orderSPR){
            let tradingPartnerName = order.EnterpriseCode;
            if(!isEmpty(tradingPartnerName)){
                return tradingPartnerName == CONTANTS.spr;
            }
        }

        /**
         * Check for Essendant
        */
        let orderEssendant = jsonObjResponse.AcknowledgePurchaseOrder;
        if(orderEssendant){
            return true;
        }
        return false;
    }

    const isInvoice = (jsonObjResponse) => {

        /**
         * Check for SPR
        */
        let invoiceSPR = jsonObjResponse.Invoice;
        if(invoiceSPR){
            return true;
        }

        /**
         * Check for Essendant
        */
        let invoiceEssendant = jsonObjResponse.ShowInvoice;
        if(invoiceEssendant){
            return true;
        }

        return false;
    }

    /**
     * It returns true if the trading partner name is equal to the constant value "spr".
     * @param jsonObjResponse - The JSON object that is returned from the API call.
     * @returns A boolean value.
    */
    function isAcknowledgmentSPR(jsonObjResponse){
        let order = jsonObjResponse.Order;
        if(order){
            let tradingPartnerName = order.EnterpriseCode;
            if(!isEmpty(tradingPartnerName)){
                return tradingPartnerName == CONTANTS.spr;
            }
        }
        return false;
    }

    function isInvoiceSPR(jsonObjResponse){
        let invoiceSPR = jsonObjResponse.Invoice;
        if(invoiceSPR){
            return true;
        }
        return false;
    }

    /**
     * It returns true if the trading partner name is equal to the constant value "spr".
     * @param jsonObjResponse - The JSON object that is returned from the API call.
     * @returns A boolean value.
    */
    function isAcknowledgmentEssendant(jsonObjResponse){
        let orderEssendant = jsonObjResponse.AcknowledgePurchaseOrder;
        if(orderEssendant){
            return true;
        }
        return false;
    }

    function isInvoiceEssendant(jsonObjResponse){
        let invoiceEssendant = jsonObjResponse.ShowInvoice;
        if(invoiceEssendant){
            return true;
        }
        return false;
    }

    return {post}

 });
