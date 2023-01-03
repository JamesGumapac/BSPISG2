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
          sku: "AAG013200",
          title:
            "Lined Notes Pages for Planners/Organizers, 6.75 x 3.75, White Sheets, Undated",
          price: 4.67,
          list_price: 7.19,
          description:
            "Lined notes pages are loose-leaf for easy insert and removal. High-quality paper features superior ink bleed resistance. Undated format to use anytime for list and notes of all kinds. Punched for fit with any matching size ring planner or organizer. 30 sheets per pack. Dated/Undated: Undated; Academic Year: No; Julian Dates: No; Size (Bound-Side First): 6.75 x 3.75.",
          keywords:
            "AT-A-GLANCE® AAG013200, AAG-013200, 089138023792, Lined Notes Pages for Planners/Organizers, 6.75 x 3.75, White Sheets, Undated, Loose Leaf Refills,  Lined Notes,  Personal Organizer,   Calendar,  Agendas,  Annuals,  Appointment Tracking,  Dates,  Dating,  Organizers,  Pages,  Time-Management  ",
          gtin: "089138023792",
          uom: "EA",
          mpn: "013200",
          unspsc: "44112005",
          manufacturer_id: "e084730d-cbca-4d31-ae95-14f19294bee1",
          manufacturer_name: "At-A-Glance",
          shipping_weight: 0.114,
          shipping_height: 0.25,
          shipping_length: 6.813,
          shipping_width: 3.75,
          default_vendor_id: "B8802687-B2F2-41bb-B221-9433F85B271E",
          default_vendor_name: "Essendant",
          vendor_associations: [],
        },
        {
          sku: "AAG031054005",
          title:
            "Black Leather Planner/Organizer Starter Set, 8.5 x 5.5, Black Cover, 12-Month (Jan to Dec): Undated",
          price: 92.68,
          list_price: 142.59,
          description:
            "Black genuine leather binder has professional look and zipper closure. Planner is undated for flexible planning with a full year of tabbed monthly spreads. Comes with 60 two-page daily planning spreads with hourly appointments 8:00 a.m. to 7:00 p.m. Comes with 60 one-page daily planning pages with half-hourly appointments 7:00 a.m. to 6:30 p.m. Comes with eight weekly planning spreads with hourly appointments 7:00 a.m. to 6:00 p.m. Monday through Friday. Extra features include interior storage pockets, address and phone sections, 24 notetaking pages, a note pad and a pen loop. Binder has 7 rings and holds loose-leaf pages. Dated/Undated: Undated; Calendar Format: Daily; Weekly; Monthly; Page Format: One Day per Page; One Day per Two-Page Spread; One Week per Two-Page Spread; One Month per Two-Page Spread; Academic Year: No.",
          keywords:
            "AT-A-GLANCE® AAG031054005, AAG-031054005, 038576373259, Black Leather Planner/Organizer Starter Set, 8.5 x 5.5, Black Cover, 12-Month (Jan to Dec): Undated, Agendas,  Annuals,  Appointment Tracking,  Dates,  Dating,  Organizers,  Pages,  Time-Management  ",
          gtin: "038576373259",
          uom: "EA",
          mpn: "031054005",
          unspsc: "44112005",
          manufacturer_id: "e084730d-cbca-4d31-ae95-14f19294bee1",
          manufacturer_name: "At-A-Glance",
          shipping_weight: 1.75,
          shipping_height: 1.688,
          shipping_length: 10.375,
          shipping_width: 8.125,
          default_vendor_id: "B8802687-B2F2-41bb-B221-9433F85B271E",
          default_vendor_name: "Essendant",
          vendor_associations: [
            {
              vendor_sku: "AAG031054005",
              vendor_id: "0F9A51F8-5292-4858-8B5B-74250A4552F0",
              vendor_name: "Test3",
              uom: "EA",
              cost: 97.12,
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
          if (itemUom === vendorUom) {
            BSPItemParser.createVendorSublist(
              itemId,
              itemObj.vendor_associations
            );
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
