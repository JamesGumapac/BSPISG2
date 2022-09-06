/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

 define(['N/search', 'N/record'], function (search, record) {

    function processPOAck(jsonObjResponse){
        log.debug("Trading Partner: SPR", `Processing PO Acknowledmgnet`);
    }
    
    return {
        processPOAck: processPOAck
	};
});