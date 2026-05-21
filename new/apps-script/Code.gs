function doGet() {

  const sheet =
    SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName('Kas');

  const data =
    sheet.getDataRange()
    .getValues();

  data.shift();

  const result = data.map(row => ({

    id: row[0],
    tanggal: row[1],
    jenis: row[2],
    kategori: row[3],
    keterangan: row[4],
    nominal: row[5]

  }));

  return ContentService
    .createTextOutput(
      JSON.stringify(result)
    )
    .setMimeType(
      ContentService.MimeType.JSON
    );

}
