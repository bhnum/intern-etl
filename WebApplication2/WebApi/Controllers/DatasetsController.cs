using System;
using System.IO;
using System.Linq;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using WebApi.models;
using WebApi.Services;
using WebApi.Validations;

namespace WebApi.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class DatasetsController : ControllerBase
    {
        private readonly Database _database;
        private readonly UserValidation _userValidator;
        private readonly UserAuthorization _authorizationValidator;
        private readonly SqlTableTransformer _sqlTableTransformer;

        public DatasetsController(Database database, UserAuthorization authorizationValidator,
            UserValidation userValidator, SqlTableTransformer sqlTableTransformer)
        {
            _database = database;
            _authorizationValidator = authorizationValidator;
            _userValidator = userValidator;
            _sqlTableTransformer = sqlTableTransformer;
        }

        [HttpPost]
        [Route("create")]
        public IActionResult Create([FromBody] Dataset dataset, [FromHeader] string token)
        {
            var user = _database.Users.FirstOrDefault(x => x.Token == token);
            if (user == null)
                return Unauthorized("Wrong token");
            user.UserDatasets.Add(dataset);
            /*new SqlTableCreator().CopySql("localhost", dataset.DatabaseName,
                dataset.TableName, dataset.DatasetName);*/
            _database.SaveChangesAsync();
            return Ok("created");
        }

        [HttpPost]
        [Route("upload")]
        public IActionResult Upload([FromBody] CsvProp data, [FromHeader] string token)
        {
            try
            {
                var user = _userValidator.IsUserValid(token);
                user.UserDatasets.Add(new Dataset()
                {
                    DatasetName = data.DatasetName, IsLiked = false
                });
            }
            catch (Exception e)
            {
                return Unauthorized(e.Message);
            }

            var max = Enumerable.Prepend(_database.Datasets.Select(databaseDataset => databaseDataset.DatasetId), 0)
                .Max();
            var loader = new CsvLoader(data, max + 1);
            if (!loader.TransportCsvToSql())
            {
                return BadRequest();
            }

            _database.SaveChanges();
            return Ok();
        }

        [HttpPut]
        [Route("{id:int}")]
        public IActionResult ChangeName(int id, string newName)
        {
            var dataset = _database.Datasets.FirstOrDefault(x => x.DatasetId == id);
            if (dataset == null)
                return BadRequest("No such id");
            dataset.DatasetName = newName;
            _database.SaveChanges();
            return Ok("Name Changed.");
        }

        [HttpDelete]
        [Route("{id:int}")]
        public IActionResult Delete(int id)
        {
            var dataset = _database.Datasets.FirstOrDefault(x => x.DatasetId == id);
            if (dataset == null)
                return BadRequest("No such id");
            _database.Datasets.Remove(dataset);
            _database.SaveChanges();
            return Ok("Deleted.");
        }

        [HttpPost]
        [Route("{id:int}/like")]
        public IActionResult Like(int id)
        {
            var dataset = _database.Datasets.FirstOrDefault(x => x.DatasetId == id);
            if (dataset == null)
                return BadRequest("No such id");
            dataset.IsLiked = true;
            _database.SaveChanges();
            return Ok("Liked");
        }

        [HttpPost]
        [Route("{id:int}/dislike")]
        public IActionResult DisLike(int id)
        {
            var dataset = _database.Datasets.FirstOrDefault(x => x.DatasetId == id);
            if (dataset == null)
                return BadRequest("No such id");
            dataset.IsLiked = false;
            _database.SaveChanges();
            return Ok("DisLiked");
        }

        [HttpGet]
        public IActionResult Get([FromHeader] string token)
        {
            try
            {
                var user = _userValidator.IsUserValid(token);
                return Ok(user.UserDatasets);
            }
            catch (Exception e)
            {
                return Unauthorized(e.Message);
            }
        }

        [HttpGet]
        [Route("{id:int}/csvFile")]
        public IActionResult DownloadDataset(int id, [FromHeader] string token, char columnSeparator = ',',
            string rowSeparator = "ENTER", bool saveColumnTitle = true)
        {
            if (rowSeparator.Equals("ENTER"))
            {
                rowSeparator = "\n";
            }

            var sqlCon = new SqlConnection(Database.ConnectionString);
            sqlCon.Open();

            var sqlCmd = new SqlCommand("Select * from _" + id, sqlCon);

            var reader = sqlCmd.ExecuteReader();

            // var fileName = _database.Users.FirstOrDefault(u => u.Token == token)
            // ?.UserDatasets.FirstOrDefault(db => db.DatasetId == id)?.DatasetName + ".csv";
            // var fileName = _database.Datasets.FirstOrDefault(db => db.DatasetId == id)?.DatasetName + ".csv";
            const string fileName = "Output.csv";

            var stringBuilder = new StringBuilder();
            var output = new object[reader.FieldCount];

            for (var i = 0; i < reader.FieldCount; i++)
            {
                if (!saveColumnTitle)
                {
                    continue;
                }

                output[i] = reader.GetName(i);
            }

            stringBuilder.Append(string.Join(columnSeparator, output)).Append(rowSeparator);

            while (reader.Read())
            {
                reader.GetValues(output);
                stringBuilder.Append(string.Join(columnSeparator, output)).Append(rowSeparator);
            }

            return File(Encoding.ASCII.GetBytes(stringBuilder.ToString()), "application/csv", fileName);
        }

        [HttpGet]
        [Route("{id:int}")]
        public IActionResult GetDataset(int id)
        {
            var dataset = _database.Datasets.FirstOrDefault(x => x.DatasetId == id);
            if (dataset == null)
                return BadRequest("No such id");
            return Ok(dataset);
        }

        [HttpPost]
        [Route("preview")]
        public IActionResult Preview([FromHeader] PreviewData data, [FromHeader] string token)
        {
            try
            {
                var user = _userValidator.IsUserValid(token);
                if (!_authorizationValidator.DoesBelongToUser(user.Id, data.DbId, UserProp.Dataset))
                {
                    return BadRequest("You have No database with this id");
                }

                var simpleTable = _sqlTableTransformer.TransferData(data.DbId, data.startingIndex, data.size);
                return Ok(simpleTable);
            }
            catch (Exception e)
            {
                return Unauthorized(e.Message);
            }
        }
    }
}