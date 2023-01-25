/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define([
  "N/file",
  "N/runtime",
  "N/https",
  "N/compress",
  "./Lib/bsp_isg_item_file_parser.js",
], (file, runtime, https, compress, BSPItemParser) => {
  const getInputData = (inputContext) => {
    const functionName = "getInputData";
    log.audit(
        functionName,
        "************* GET INPUT DATA STARTED *************"
    );
    try {
      const lbIntegrationSettings = BSPItemParser.getLbSettingsForUploadItem();
      const lbResponse = https.get({
        url: lbIntegrationSettings.url,
      });
      const itemInfoContent = lbResponse.body;
      return JSON.parse(itemInfoContent);
    } catch (e) {
      log.error(functionName, e.message);
    }
  };

  const reduce = (reduceContext) => {
    const functionName = "reduce";
    try {
      const itemObj = JSON.parse(reduceContext.values);
      log.debug(functionName, itemObj);
      const itemId = BSPItemParser.ifItemExists(itemObj.sku);

      if (itemId) {
        log.audit("ITEM ALREADY EXISTS", itemObj.sku);
        BSPItemParser.updateUnitOfMeasure(itemId, itemObj.uom);
        //check if item has vendor associated with it
        if (itemObj.vendor_associations.length > 0) {
          for(let i in itemObj.vendor_associations) {
            let itemUom = itemObj.uom;
            let vendorUom = itemObj.vendor_associations[i].uom;
            let vendor = BSPItemParser.checkIfVendorExists(
                itemObj.vendor_associations[i].vendor_name,
                itemObj.vendor_associations[i].vendor_id
            );
            // update the item vendor sublist if vendor uom  = item uom
            if (itemUom === vendorUom) {
              if (BSPItemParser.checkItemVendorSublist(itemId, vendor) === -1) {
                log.debug("vendor associations",itemObj.vendor_associations[i])
                BSPItemParser.createVendorSublist(
                    itemId,
                    itemObj.vendor_associations[i]
                );
              }
            }
          }
        }
      } else {
        const newItemId = BSPItemParser.createItem(itemObj);

        log.audit("ITEM CREATED SUCCESSFULLY", newItemId);
      }
    } catch (e) {
      log.error(functionName, e.message);
    }
  };

  const summarize = (summaryContext) => {
    const functionName = "summarize";
    try {
      log.audit(functionName, {
        UsageConsumed: summaryContext.usage,
        NumberOfQueues: summaryContext.concurrency,
        NumberOfYields: summaryContext.yields,
      });
      log.audit(functionName, "************ EXECUTION COMPLETED ************");
    } catch (e) {
      log.error(functionName, e.message);
    }
  };

  return { getInputData, reduce,  summarize };
});
