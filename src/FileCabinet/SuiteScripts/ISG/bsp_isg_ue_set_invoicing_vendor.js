/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(["N/search", "N/record", "N/runtime"],

  (search, record, runtime) => {

  const afterSubmit = (context) => {
      let newRecord = context.newRecord;
      let type = context.type;

    if (type !== context.UserEventType.CREATE && type !== context.UserEventType.COPY) {

        return;

    }
    try { 
      vendorbillRec = record.load({
        type: 'vendorbill',
        id: newRecord.id,
    });
      let vendorId = vendorbillRec.getValue({fieldId: 'entity'});
      let invoicingVendor =  search.lookupFields({
          type: 'vendor',
          id: vendorId,
          columns: ['custentity_bsp_invoicingvendor']
         });
      log.debug('invoicingVendor.custentity_bsp_invoicingvendor[0].value',invoicingVendor.custentity_bsp_invoicingvendor[0].value);
     if(invoicingVendor != '')
     {
      vendorbillRec.setValue({fieldId:'entity', value: invoicingVendor.custentity_bsp_invoicingvendor[0].value})
     }
      vendorbillRec.save();
    } catch (e) {
      log.error(e.message);
    }
  };

  return { afterSubmit };
});
