/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define([
  "N/file",
  "N/runtime",
  "N/https",
  "./Lib/bsp_isg_item_file_parser.js",
], (file, runtime, https, BSPItemParser) => {
  const getInputData = (inputContext) => {
    const functionName = "getInputData";
    log.audit(
      functionName,
      "************* GET INPUT DATA STARTED *************"
    );
    try {
      const sampleFeed = [
        {
          sku: "KCC38691",
          title:
            "G60 ANSI Level 2 Cut-Resistant Glove, 240 mm Length, Large/Size 9, White/Black, 12 Pairs",
          price: 113.02,
          list_price: 161.45,
          description:
            "When duty turns dangerous, these durable, cut-resistant gloves work to protect your hands. A sturdy black polyurethane coating enhances your grip for tough projects and helps hide dirt for longer wear. Comfortable fit. Style: Cut-Resistant; Wrist Style: Knit Cuff; Material(s): HMPE Engineered Yarn/Nylon/Spandex Seamless Knit Shell; Polyurethane-Coated Palm; Thumb Style: Full.",
          keywords:
            "KleenGuard™ KCC38691, KCC-38691, 036000386912, G60 ANSI Level 2 Cut-Resistant Glove, 240 mm Length, Large/Size 9, White/Black, 12 Pairs, G60,  Cut-Resistant,  Cut Resistant,  Polyurethane,  Hand,  Covering,  Safety,  Sanitary,  Food-Service,  Janitorial,  Kitchens  ",
          gtin: "036000386912",
          uom: "CT",
          mpn: "38691",
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
              vendor_sku: "KCC38691",
              vendor_id: "B8802687-B2F2-41bb-B221-9433F85B271E",
              vendor_name: "Essendant",
              uom: "CT",
              cost: 69.74,
              min_qty: 1,
            },
          ],
        },
        {
          sku: "KCC38693",
          title:
            "G60 ANSI Level 2 Cut-Resistant Gloves, 265 mm Length, 2X-Large, White/Black, 12 Pairs",
          price: 113.02,
          list_price: 161.45,
          description:
            "When duty turns dangerous, these durable, cut-resistant gloves work to protect your hands. A sturdy black polyurethane coating enhances your grip for tough projects and helps hide dirt for longer wear. Comfortable fit. Style: Cut-Resistant; Wrist Style: Knit Cuff; Material(s): HMPE Engineered Yarn/Nylon/Spandex Seamless Knit Shell; Polyurethane-Coated Palm; Thumb Style: Full.",
          keywords:
            "KleenGuard™ KCC38693, KCC-38693, 036000386936, G60 ANSI Level 2 Cut-Resistant Gloves, 265 mm Length, 2X-Large, White/Black, 12 Pairs, G60,  Cut-Resistant,  Hand,  Covering,  Safety,  Sanitary,  Food-Service,  Janitorial,  Kitchens  ",
          gtin: "036000386936",
          uom: "CT",
          mpn: "38693",
          unspsc: "46181504",
          manufacturer_id: "44f91840-0a9d-484f-8745-2a3745fa7f85",
          manufacturer_name: "KleenGuard",
          shipping_weight: 2.1,
          shipping_height: 6.0,
          shipping_length: 11.625,
          shipping_width: 6.375,
          default_vendor_id: "B8802687-B2F2-41bb-B221-9433F85B271E",
          default_vendor_name: "Test2",
          vendor_associations: [
            {
              vendor_sku: "KCC38693",
              vendor_id: "B8802687-B2F2-41bb-B221-9433F85B271E",
              vendor_name: "Test78",
              uom: "CT",
              cost: 69.74,
              min_qty: 1,
            },
          ],
        },
        {
          sku: "KCC38920",
          title:
            "A35 Liquid and Particle Protection Coveralls, Zipper Front, 2X-Large, White, 25/Carton",
          price: 107.8,
          list_price: 154.0,
          description:
            "Ensure safe working conditions. Lightweight and comfortable microporous film laminate provides an excellent liquid and particulate barrier. Zipper front keeps the coveralls easy to put on and take off. Reliable apparel for applications such as liquid handling, pressure washing and general industrial tasks. Zipper Front. Apparel Type: Coverall; Material(s): Microporous Film Laminate; Color(s): White; Color Family: White.",
          keywords:
            "KleenGuard™ KCC38920, KCC-38920, 000000000000, A35 Liquid and Particle Protection Coveralls, Zipper Front, 2X-Large, White, 25/Carton, Attire,  Clothes,  Clothing,  Coverings,  Gear,  Wear  ",
          uom: "CT",
          mpn: "38920",
          unspsc: "46181503",
          manufacturer_id: "44f91840-0a9d-484f-8745-2a3745fa7f85",
          manufacturer_name: "KleenGuard",
          shipping_weight: 10.2,
          shipping_height: 11.3,
          shipping_length: 14.8,
          shipping_width: 10.5,
          default_vendor_id: "B8802687-B2F2-41bb-B221-9433F85B271E",
          default_vendor_name: "Test7",
          vendor_associations: [
            {
              vendor_sku: "KCC38920",
              vendor_id: "B8802687-B2F2-41bb-B221-9433F85B271E",
              vendor_name: "Test19",
              uom: "CT",
              cost: 91.92,
              min_qty: 1,
            },
          ],
        },
      ];
      // const lbIntegrationSettings = BSPItemParser.getLbSettingsForUploadItem();
      // const lbResponse = https.get({
      // 	url: lbIntegrationSettings.url,
      // });
      // let itemInfoContent = lbResponse.body;
      // let itemList = itemInfoContent
      // 	.split("\n")
      // 	.map((line) => line.split("\t"));

      //	return itemList.slice(1); //remove the column part of the arrays
      return sampleFeed;
    } catch (e) {
      log.error(functionName, e.message);
    }
  };

  const reduce = (reduceContext) => {
    const functionName = "reduce";
    try {
      const itemObj = JSON.parse(reduceContext.values);
      //const itemObj = BSPItemParser.getItemObj(itemValue);
      log.debug("Reduce: itemObj", itemObj);
      const itemId = BSPItemParser.ifItemExists(itemObj.sku);
      if (itemId) {
        if (itemObj.vendor_associations.length > 0) {
          log.debug("ITEM ALREADY EXISTS", itemObj.sku);
          let itemUom = itemObj.uom;
          let vendorUom = itemObj.vendor_associations[0].uom;
          let vendor = BSPItemParser.checkIfVendorExists(
            itemObj.vendor_associations[0].vendor_name
          );

          if (itemUom === vendorUom) {
            if (BSPItemParser.checkItemVendorSublist(itemId, vendor) === -1) {
              BSPItemParser.createVendorSublist(
                itemId,
                itemObj.vendor_associations
              );
            }
          } // update the item vendor sublist
        }
      } else {
        const newItemId = BSPItemParser.createItem(itemObj);
        if (newItemId) {
          log.debug("ITEM CREATED SUCCESSFULLY", newItemId);
        }
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
