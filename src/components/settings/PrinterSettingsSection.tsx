import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Printer, Save, Loader2, FileText, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

export const PrinterSettingsSection = () => {
    const { t, language } = useLanguage();

    const [paperSize, setPaperSize] = useState("58mm");
    const [autoPrint, setAutoPrint] = useState(false);
    const [showFooter, setShowFooter] = useState(true);
    const [customFooter, setCustomFooter] = useState("Thank you for shopping with us!");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const savedSettings = localStorage.getItem("printer-settings");
        if (savedSettings) {
            const parsed = JSON.parse(savedSettings);
            setPaperSize(parsed.paperSize || "58mm");
            setAutoPrint(parsed.autoPrint || false);
            setShowFooter(parsed.showFooter ?? true);
            setCustomFooter(parsed.customFooter || "Thank you for shopping with us!");
        }
    }, []);

    const handleSave = async () => {
        setSaving(true);
        // Simulate a short delay for UX
        await new Promise(resolve => setTimeout(resolve, 500));

        const settings = {
            paperSize,
            autoPrint,
            showFooter,
            customFooter
        };

        localStorage.setItem("printer-settings", JSON.stringify(settings));
        toast({ title: t("settings_saved") });
        setSaving(false);
    };

    return (
        <div className="space-y-6">
            <Card className="border-border/50 shadow-sm bg-card">
                <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-indigo-500/10">
                            <Printer className="h-5 w-5 text-indigo-500" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">
                                {language === 'bn' ? 'প্রিন্টার সেটিংস' : 'Printer Configuration'}
                            </CardTitle>
                            <CardDescription>
                                {language === 'bn' ? 'POS মেমো এবং ইনভয়েস প্রিন্ট সেটিংস' : 'Configure POS memo and invoice printing'}
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Paper Size */}
                    <div className="space-y-3">
                        <Label>{language === 'bn' ? 'কাগজের আকার' : 'Paper Size'}</Label>
                        <div className="grid grid-cols-2 gap-4">
                            <div
                                className={`cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center gap-2 transition-all ${paperSize === '58mm' ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/50'}`}
                                onClick={() => setPaperSize('58mm')}
                            >
                                <FileText className="h-6 w-6 text-muted-foreground" />
                                <span className="font-semibold">58mm</span>
                                <span className="text-xs text-muted-foreground">(Receipt)</span>
                                {paperSize === '58mm' && <Check className="h-4 w-4 text-primary absolute top-2 right-2" />}
                            </div>
                            <div
                                className={`cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center gap-2 transition-all ${paperSize === '80mm' ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/50'}`}
                                onClick={() => setPaperSize('80mm')}
                            >
                                <FileText className="h-8 w-8 text-muted-foreground" />
                                <span className="font-semibold">80mm</span>
                                <span className="text-xs text-muted-foreground">(Standard)</span>
                                {paperSize === '80mm' && <Check className="h-4 w-4 text-primary absolute top-2 right-2" />}
                            </div>
                        </div>
                    </div>

                    {/* Auto Print */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border">
                        <div className="space-y-0.5">
                            <Label className="text-base">{language === 'bn' ? 'অটো প্রিন্ট' : 'Auto-Print Receipt'}</Label>
                            <p className="text-xs text-muted-foreground">
                                {language === 'bn' ? 'বিক্রয়ের পর স্বয়ংক্রিয়ভাবে প্রিন্ট করুন' : 'Automatically print receipt after sale confirmation'}
                            </p>
                        </div>
                        <Switch checked={autoPrint} onCheckedChange={setAutoPrint} />
                    </div>

                    {/* Footer Text */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label>{language === 'bn' ? 'ফুটার বার্তা' : 'Footer Message'}</Label>
                            <Switch checked={showFooter} onCheckedChange={setShowFooter} />
                        </div>
                        {showFooter && (
                            <Input
                                value={customFooter}
                                onChange={(e) => setCustomFooter(e.target.value)}
                                placeholder="Thank you for your business!"
                                className="h-11"
                            />
                        )}
                    </div>

                    <Button onClick={handleSave} disabled={saving} className="w-full h-11 text-base">
                        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        {t("save_changes")}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
};
