/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
 define([
    'N/runtime',
    'N/record', 
    'N/search', 
    '../Lib/bsp_isg_as2_service.js', 
    '../Lib/bsp_isg_trading_partners.js'],
 /**
 * @param{runtime} runtime
 * @param{record} record
 * @param{search} search
 * @param{BSP_AS2Service} BSP_AS2Service
 * @param{BSPTradingParnters} BSPTradingParnters
 */
 (runtime, record, search, BSP_AS2Service, BSPTradingParnters) => {

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
             decodedXMLresponse = linearize(decodedXMLresponse);
             let jsonObjResponse = BSP_AS2Service.parseResponseXml(decodedXMLresponse);  
             log.debug(functionName, `${JSON.stringify(jsonObjResponse)}`);  
                    
             if(isPOAcknowledgment(jsonObjResponse)){

                if(isAcknowledgmentSPR(jsonObjResponse)){
                    log.debug(functionName, `This is an Acknowledgment from SPR`);
                    createAS2incomingMessageRecord(BSPTradingParnters.constants().spr, "Acknowledgment", jsonObjResponse);
                }else if(isAcknowledgmentEssendant(jsonObjResponse)){
                    log.debug(functionName, `This is an Acknowledgment from Essendant`);
                    createAS2incomingMessageRecord(BSPTradingParnters.constants().essendant, "Acknowledgment", jsonObjResponse);
                }
                
             }else if(isShipmentNotification(jsonObjResponse)){

                if(isShipmentNotificationSPR(jsonObjResponse)){
                    log.debug(functionName, `This is a Shipment Notification from SPR`);
                    createAS2incomingMessageRecord(BSPTradingParnters.constants().spr, "ASN", jsonObjResponse);
                }else if(isShipmentNotificationEssendant(jsonObjResponse)){
                    log.debug(functionName, `This is a Shipment Notification from Essendant`);
                    createAS2incomingMessageRecord(BSPTradingParnters.constants().essendant, "ASN", jsonObjResponse);
                }

             }else if(isInvoice(jsonObjResponse)){

                if(isInvoiceSPR(jsonObjResponse)){
                    log.debug(functionName, `This is an Invoice from SPR`);
                    createAS2incomingMessageRecord(BSPTradingParnters.constants().spr, "Invoice", jsonObjResponse);
                }else if(isInvoiceEssendant(jsonObjResponse)){
                    log.debug(functionName, `This is an Invoice from Essendant`);
                    createAS2incomingMessageRecord(BSPTradingParnters.constants().essendant, "Invoice", jsonObjResponse);
                } 

             }

             response = {
                 "operation_code": "200",
                 "operation_message": "OK"
             };
         }catch(error){
             log.error(functionName, `Error: ${error.toString()}`);
             response = {
                 "operation_code": "500",
                 "operation_message": "Internal error occured",
                 "result": error.message
             };
         } 
         return response;
    }

    /**
     * Checks if the JSON object is a PO acknowledgment.
     * @param jsonObjResponse - The JSON object that is returned from the API call.
     * @returns A boolean value.
    */
    const isPOAcknowledgment = (jsonObjResponse) => {

        /**
         * Check for SPR
        */
        let orderSPR = jsonObjResponse.Order;
        if(orderSPR){
            return true;
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

    /**
     * Checks if the JSON object is an Invoice.
     * @param jsonObjResponse - The JSON object that is returned from the API call.
     * @returns A boolean value.
    */   
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
     * Checks if the JSON object is a Shipment Notification.
     * @param jsonObjResponse - The JSON object that is returned from the API call.
     * @returns A boolean value.
    */   
    const isShipmentNotification = (jsonObjResponse) => {

        /**
         * Check for SPR
        */
        let shipmentSPR = jsonObjResponse.manifest;
        if(shipmentSPR){
            return true;
        }

        /**
         * Check for Essendant
        */
        let shipmentEssendant = jsonObjResponse.ShowShipment;
        if(shipmentEssendant){
            return true;
        }

        return false;
    }

    /**
     * It returns true if the trading partner name of the Acknowledgment is equal to the constant value "spr".
     * @param jsonObjResponse - The JSON object that is returned from the API call.
     * @returns A boolean value.
    */
    function isAcknowledgmentSPR(jsonObjResponse){
        let orderSPR = jsonObjResponse.Order;
        if(orderSPR){
            return true;
        }
        return false;
    }

    /**
     * It returns true if the trading partner name of the Invoice is equal to the constant value "spr".
     * @param jsonObjResponse - The JSON object that is returned from the API call.
     * @returns A boolean value.
    */
    function isInvoiceSPR(jsonObjResponse){
        let invoiceSPR = jsonObjResponse.Invoice;
        if(invoiceSPR){
            return true;
        }
        return false;
    }

    /**
     * It returns true if the trading partner name of the Shipment Notification is equal to the constant value "spr".
     * @param jsonObjResponse - The JSON object that is returned from the API call.
     * @returns A boolean value.
    */
    function isShipmentNotificationSPR(jsonObjResponse){
        let shipmentSPR = jsonObjResponse.manifest;
        if(shipmentSPR){
            return true;
        }
        return false;
    }

    /**
     * It returns true if the trading partner name of the Acknowledgment is equal to the constant value "Essendant Inc".
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

    /**
     * It returns true if the trading partner name of the Invoice is equal to the constant value "Essendant Inc".
     * @param jsonObjResponse - The JSON object that is returned from the API call.
     * @returns A boolean value.
    */
    function isInvoiceEssendant(jsonObjResponse){
        let invoiceEssendant = jsonObjResponse.ShowInvoice;
        if(invoiceEssendant){
            return true;
        }
        return false;
    }

    /**
     * It returns true if the trading partner name of the Shipment Notification is equal to the constant value "Essendant Inc".
     * @param jsonObjResponse - The JSON object that is returned from the API call.
     * @returns A boolean value.
    */
    function isShipmentNotificationEssendant(jsonObjResponse){
        let shipmentEssendant = jsonObjResponse.ShowShipment;
        if(shipmentEssendant){
            return true;
        }
        return false;
    }


    /**
     * This function creates a new record in the custom record type "customrecord_bsp_isg_as2_incoming_msg"
     * and sets the values of the fields "custrecord_bsp_isg_trading_partner",
     * "custrecord_bsp_isg_message_type", and "custrecord_bsp_isg_payload" to the values of the parameters
     * "tradingPartner", "messageType", and "jsonObjResponse" respectively
     * @param tradingPartner - The internal ID of the trading partner record
     * @param messageType - The type of message that was received.
     * @param jsonObjResponse - This is the JSON object that is returned from the AS2 server.
     */
    function createAS2incomingMessageRecord(tradingPartner, messageType, jsonObjResponse){
        let as2MessageRecord = record.create({
            type: "customrecord_bsp_isg_as2_incoming_msg",
          });
    
          as2MessageRecord.setValue({
            fieldId: "custrecord_bsp_isg_trading_partner",
            value: tradingPartner,
          });
          as2MessageRecord.setValue({
            fieldId: "custrecord_bsp_isg_message_type",
            value: messageType,
          });
          as2MessageRecord.setValue({
            fieldId: "custrecord_bsp_isg_payload",
            value: JSON.stringify(jsonObjResponse),
          });
    
          as2MessageRecord.save();
          log.debug("createAS2incomingMessageRecord", "AS2 Incoming Message Record Created");
    }

    function linearize(xml) {
        return (xml!= null) ? xml.trim().replace(/(>|&gt;){1,1}( |\t|\n|\r|\s)*(<|&lt;){1,1}/g, "$1$3") : null;
    }

    return {post}

 });
