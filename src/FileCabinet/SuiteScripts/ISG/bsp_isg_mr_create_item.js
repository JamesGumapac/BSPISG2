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
      // const lbIntegrationSettings = BSPItemParser.getLbSettingsForUploadItem();
      // const lbResponse = https.get({
      //   url: lbIntegrationSettings.url,
      // });
      // const itemInfoContent = lbResponse.body;
      // return JSON.parse(itemInfoContent);
      return [
        {
          sku: "KCC38689",
          title:
            "G60 ANSI Level 2 Cut-Resistant Gloves, 220 mm Length, Small, White/Black, 12 Pairs",
          price: 113.02,
          list_price: 161.45,
          description:
            "When duty turns dangerous, these durable, cut-resistant gloves work to protect your hands. A sturdy black polyurethane coating enhances your grip for tough projects and helps hide dirt for longer wear. Comfortable fit. Style: Cut-Resistant; Wrist Style: Knit Cuff; Material(s): HMPE Engineered Yarn/Nylon/Spandex Seamless Knit Shell; Polyurethane-Coated Palm; Thumb Style: Full.",
          keywords:
            "KleenGuard™ KCC38689, KCC-38689, 036000386899, G60 ANSI Level 2 Cut-Resistant Gloves, 220 mm Length, Small, White/Black, 12 Pairs, G60,  Cut-Resistant,  Hand,  Covering,  Safety,  Sanitary,  Food-Service,  Janitorial,  Kitchens  ",
          gtin: "036000386899",
          mpn: "38689",
          uom: "CM",
          unspsc: "46181504",
          manufacturer_id: "44f91840-0a9d-484f-8745-2a3745fa7f85",
          manufacturer_name: "KleenGuard",
          shipping_weight: 2.1,
          shipping_height: 6.0,
          shipping_length: 11.625,
          shipping_width: 6.375,
          default_vendor_id: "B8802687-B2F2-41bb-B221-9433F85B271E",
          default_vendor_name: "Essendant",
          vendor_associations: [
            {
              vendor_sku: "KCC38689",
              vendor_id: "B8802687-B2F2-41bb-B221-9433F85B271E",
              vendor_name: "Essendant",
              uom: "CM",
              cost: 69.74,
              min_qty: 1,
            },
          ],
        }
      ];
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
        log.debug("ITEM ALREADY EXISTS", itemObj.sku);
        BSPItemParser.updateUnitOfMeasure(itemId, itemObj.uom);
        //check if item has vendor associated with it
        if (itemObj.vendor_associations.length > 0) {
          let itemUom = itemObj.uom;
          let vendorUom = itemObj.vendor_associations[0].uom;
          let vendor = BSPItemParser.checkIfVendorExists(
            itemObj.vendor_associations[0].vendor_name
          );
          // update the item vendor sublist if vendor uom  = item uom
          if (itemUom === vendorUom) {
            if (BSPItemParser.checkItemVendorSublist(itemId, vendor) === -1) {
              BSPItemParser.createVendorSublist(
                itemId,
                itemObj.vendor_associations
              );
            }
          }
        }
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

  return { getInputData, reduce, summarize };
});
