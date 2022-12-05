/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define([
  "N/file",
  "N/runtime",
  "N/https",
  "./Lib/bsp_isg_item_file_parser.js",
  "./Lib/bsp_isg_update_pricing.js",
], (file, runtime, https, BSPItemParser, BSPPricingUtil) => {
 
  const getInputData = (inputContext) => {
    const functionName = "getInputData";
    log.audit(functionName,"************* GET INPUT DATA STARTED *************")
   try {
      const params = getParameters();
      const lbIntegrationSettings = params.integrationSettings;
      const url = BSPItemParser.getURL(lbIntegrationSettings)
      const lbResponse = https.get({
        url: url,
      });
      let itemInfoContent = lbResponse.body;
      let itemList = itemInfoContent.split('\n').map((line) => line.split('\t'))
      return itemList.slice(1)//remove the column part of the arrays
    } catch (e) {
      log.error(functionName, e.message);
    }
  }

  const reduce = (reduceContext) => {
   
    const functionName = "reduce";
    log.audit(functionName,"************* REDUCE STARTED *************")
    try {
      const itemValue = reduceContext.values;
      const itemObj = BSPItemParser.getItemObj(itemValue);
      log.debug("Reduce itemObj", itemObj);
      if (BSPPricingUtil.checkItemId(itemObj.id)) {
        log.debug("ITEM ALREADY EXIST", itemObj.id);
      } else {
        const newItemId = BSPItemParser.createItem(itemObj);
        log.debug("ITEM CREATED SUCCESSFULLY", newItemId);
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
  
  /**
   *Get the script parameters
   */
  function getParameters() {
    const objScript = runtime.getCurrentScript();
    let objParams = {};
    objParams = {
      integrationSettings: objScript.getParameter({
        name: "custscript_bsp_isg_upload_item_tp",
      }),
      
    };
    
    return objParams;
  }
  return { getInputData,reduce, summarize };
});
