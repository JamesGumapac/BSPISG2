/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/record', 'N/search', 'N/file', './lib/bsp_as2_service.js'],
    /**
 * @param{record} record
 * @param{search} search
 */
    (record, search, file, BSP_AS2Service) => {

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
                log.debug(functionName, `Json Obj Response:  ${JSON.stringify(jsonObjResponse)}`);
                
                let resultFile = file.create({
                    name: `${requestBody.Payload.Name}.xml`,
                    fileType: file.Type.XMLDOC,
                    contents: decodedXMLresponse,
                    folder: 11266
                });

                let resultFileId = resultFile.save();
                log.debug(functionName, `XML Decoded - File created:  ${resultFileId}`);

                response = {
                    "operation_code": "SUCCESS",
                    "operation_message": "Ok",
                };
            }catch(error){
                log.error(functionName, `Error: ${error.toString()}`);
                response = {
                    "operation_code": "ERROR",
                    "operation_message": "Internal error occured",
                };
            } 
            return response;
        }

        return {post}

    });
