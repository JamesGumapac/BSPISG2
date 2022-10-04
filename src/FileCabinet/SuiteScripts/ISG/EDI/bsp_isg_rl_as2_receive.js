/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
 define(['N/record', 'N/search', '../Lib/bsp_isg_as2_service.js', '../Lib/bsp_isg_trading_partners.js', '../Lib/bsp_isg_transmitions_util.js'],
 /**
* @param{record} record
* @param{search} search
*/
 (record, search, BSP_AS2Service, BSPTradingParnters, BSPTransmitionsUtil) => {

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

             log.debug(functionName, `Request Body:  ${decodedXMLresponse}`);

             let jsonObjResponse = BSP_AS2Service.parseResponseXml(decodedXMLresponse);  
             log.debug(functionName, `${JSON.stringify(jsonObjResponse)}`);  
                    
             if(isPOAcknowledgment(jsonObjResponse)){
                 /**
                  * Check Trading partner Origin
                 */
                 let result = null;
                 if(BSPTradingParnters.isAcknowledgmentSPR(jsonObjResponse)){
                     result = BSPTradingParnters.processPOAck(jsonObjResponse, BSPTradingParnters.constants().spr);
                 }else{
                     result = BSPTradingParnters.processPOAck(jsonObjResponse, BSPTradingParnters.constants().essendant);
                 }
                 
                 if(result && result.queueID){
                     BSPTransmitionsUtil.checkTransmissionQueue(result.queueID);
                 }
             }else if(isInvoice(jsonObjResponse)){

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
         return true;
    }

    const isInvoice = (jsonObjResponse) => {
         return true;
    }

    return {post}

 });
