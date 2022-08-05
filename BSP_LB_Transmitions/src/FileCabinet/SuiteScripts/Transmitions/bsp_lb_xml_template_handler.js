/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(['./lib/xml_template_handler.js', './lib/bsp_lb_transmitions_util.js'],

    (XMLTemplateHandler, BSPTransmitionUtil) => {

        /**
         * Defines the Scheduled script trigger point.
         * @param {Object} scriptContext
         * @param {string} scriptContext.type - Script execution context. Use values from the scriptContext.InvocationType enum.
         * @since 2015.2
         */
        const execute = (scriptContext) => {
            let functionName = "execute";
            try{
                let content = getContent();
                let templateID = content.templateID;
                let dataContent = content.data;
                let xmlFileResultID = XMLTemplateHandler.buildFileFromTemplate(templateID, dataContent);
                log.debug(functionName, xmlFileResultID);
            }catch (error)
            {
                log.error(functionName, {error: error.toString()});
            }
        }

        
        /**
         * It gets the transmition record, the template ID, the company info, the date created, the
         * document control number, the action code, and the orders info
         * @returns an object with two properties: templateID and data.
        */
        const getContent = () =>{

            let transmition = BSPTransmitionUtil.getTransmition();
            let templateID = transmition.templateXMLfile;

            let vendorUniqueID = transmition.vendorUniqueID;
            let company = BSPTransmitionUtil.getCompanyInfo();
            let dateCreated = new Date();
            let documentControlNumber = BSPTransmitionUtil.constants().documentControlNumber;
            let actionCode = BSPTransmitionUtil.constants().actionCode;

            let ordersInfo = BSPTransmitionUtil.getOrdersData(transmition.ordersSavedSearch);

            let data = {
                companyID: company,
                vendorUniqueID: vendorUniqueID,
                dateCreated: dateCreated,
                documentControlNumber: documentControlNumber,
                actionCode: actionCode,
                orders: ordersInfo
            }
            return {templateID: templateID, data: data};
        }



        return {execute}

    });
