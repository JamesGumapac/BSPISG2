/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/record', 'N/search', './lib/bsp_as2_service.js', './lib/bsp_trading_partners.js'],
    /**
 * @param{record} record
 * @param{search} search
 */
    (record, search, BSP_AS2Service, BSPTradingParnters) => {

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
                       
                /**
                 * Check Trading partner Origin
                */
                if(BSPTradingParnters.isAcknowledgmentSPR(jsonObjResponse)){
                    BSPTradingParnters.processPOAck(jsonObjResponse, BSPTradingParnters.constants().spr);
                }else{
                    BSPTradingParnters.processPOAck(jsonObjResponse, BSPTradingParnters.constants().essendant);
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

        return {post}

    });
