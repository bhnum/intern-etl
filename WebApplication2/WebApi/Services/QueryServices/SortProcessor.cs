using System.Text.Json;
using WebApi.models.SortModels;
using WebApi.Services.Sql;

namespace WebApi.Services.QueryServices
{
    public class SortProcessor : QueryProcessor
    {
        public SortProcessor(string instruction)
        {
            Instruction = instruction;
        }

        public sealed override string Instruction { get; set; }

        public override void Handle(ISqlConnection applyingSql, string startingDatasetName,
            string destinationDatasetName)
        {
            applyingSql.SendQuery(
                InterpretToSql(Instruction.Replace("\\\"", "\""), startingDatasetName, destinationDatasetName));
        }

        public static string InterpretToSql(string instruction, string startingDatasetName,
            string destinationDatasetName)
        {
            var sortConfig = JsonSerializer.Deserialize<SortConfig>(instruction);

            if (sortConfig == null) return "";

            return $"SELECT * INTO {destinationDatasetName}" +
                   $" FROM {startingDatasetName} " +
                   $"ORDER BY {sortConfig.GetFields()}";
        }
    }
}