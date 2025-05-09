
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, ArrowLeft, FileUp, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setValidationResult(null);
      setImportResult(null);
    }
  };

  const validateFile = async () => {
    if (!file) return;

    setIsValidating(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/import/validate', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      setValidationResult(result);
      
      toast({
        title: "Validation Complete",
        description: `Valid: ${result.valid}, Invalid: ${result.invalid}`,
        variant: result.invalid > 0 ? "destructive" : "default",
      });
    } catch (error) {
      toast({
        title: "Validation Failed",
        description: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const importFile = async () => {
    if (!file) return;

    setIsImporting(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/import/appointments', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      setImportResult(result);
      
      // Refresh appointment data
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      
      toast({
        title: "Import Complete",
        description: `Successfully imported ${result.success} appointments. Failed: ${result.failed}`,
        variant: result.failed > 0 ? "destructive" : "default",
      });
    } catch (error) {
      toast({
        title: "Import Failed",
        description: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const downloadTemplate = () => {
    const a = document.createElement('a');
    a.href = '/import-template.json';
    a.download = 'import-template.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <Button variant="outline" asChild>
          <Link href="/appointments">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Appointments
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold">Import Appointments</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upload Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-4">
                  Import your previous appointment data from a JSON file. The file must match the required schema.
                </p>
                <Button 
                  variant="outline" 
                  onClick={downloadTemplate}
                  className="mb-4"
                >
                  Download Template
                </Button>
              </div>
              
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Input
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground">Upload a JSON file (max 10MB)</p>
              </div>

              <div className="flex space-x-2">
                <Button 
                  onClick={validateFile} 
                  disabled={!file || isValidating || isImporting}
                  variant="outline"
                >
                  {isValidating ? "Validating..." : "Validate File"}
                </Button>
                <Button 
                  onClick={importFile} 
                  disabled={!file || isImporting || (!validationResult?.valid && !validationResult?.invalid)}
                  variant="default"
                >
                  {isImporting ? "Importing..." : "Import Data"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
          </CardHeader>
          <CardContent>
            {validationResult && (
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2">Validation Results</h3>
                <div className="flex space-x-4 mb-2">
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                    <span>Valid: {validationResult.valid}</span>
                  </div>
                  <div className="flex items-center">
                    <XCircle className="h-4 w-4 text-red-500 mr-1" />
                    <span>Invalid: {validationResult.invalid}</span>
                  </div>
                </div>
                
                {validationResult.errors && validationResult.errors.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">Validation Errors:</h4>
                    <div className="max-h-60 overflow-y-auto">
                      {validationResult.errors.slice(0, 10).map((error: any, index: number) => (
                        <Alert key={index} variant="destructive" className="mb-2">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Item at index {error.index}</AlertTitle>
                          <AlertDescription>
                            <ul className="list-disc list-inside">
                              {error.errors.map((err: string, i: number) => (
                                <li key={i} className="text-xs">{err}</li>
                              ))}
                            </ul>
                          </AlertDescription>
                        </Alert>
                      ))}
                      {validationResult.errors.length > 10 && (
                        <p className="text-xs text-muted-foreground">
                          ...and {validationResult.errors.length - 10} more errors
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {importResult && (
              <div>
                <h3 className="text-lg font-medium mb-2">Import Results</h3>
                <div className="flex space-x-4">
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                    <span>Imported: {importResult.success}</span>
                  </div>
                  <div className="flex items-center">
                    <XCircle className="h-4 w-4 text-red-500 mr-1" />
                    <span>Failed: {importResult.failed}</span>
                  </div>
                </div>
                
                {importResult.failed > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-4"
                    onClick={() => console.log(importResult.errors)}
                  >
                    View Failed Items
                  </Button>
                )}
              </div>
            )}
            
            {!validationResult && !importResult && (
              <div className="flex justify-center items-center h-32 text-muted-foreground">
                Upload and validate a file to see results
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
