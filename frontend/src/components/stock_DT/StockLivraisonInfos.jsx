import { useState, useEffect } from "react"
import {CableDataIcon, AlertIcon, InfoIcon, MiniTools, SimpleInfo} from "../../icons/index"
import { ProgressSpinner } from "primereact/progressspinner"
import { Stock } from "../../backend/stock/Stock"
import { Link } from "react-router"

export default function StockLivraisonInfos() {

    const stock = new Stock()


    const [loadingStock, setLoadingStock] = useState(false)
    const [sotckDT, setStockDT] = useState([])

    useEffect( ()=>{
        const fetchStock = async () => {
        setLoadingStock(true)
        try{
            let data;
            data = await stock.getAllStocks()
            console.log(data)
            const stock_livraison = data.filter(item =>{
                return item.service == 3;
            });
            setStockDT(stock_livraison)
        }catch(error){
        console.log('Error fetching data ',error)
        console.error('Erreur lors de la génération du formulaire')
        }finally{
        setLoadingStock(false)
        }
        };
        fetchStock();
    },[])
    return (
        <>
            <div>
                <div>
                    <div className="mb-6">
                        <div className="text-xl font-bold">
                            <span className="me-6">
                                Stock Livraison
                            </span>
                            <Link to={"/modifier-stock"}>
                                <span className="text-red-500 text-xl"><i className="pi pi-pencil"></i></span>
                            </Link>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-6">
                    <div className="w-full">
                        {loadingStock ? 
                        (
                            <ProgressSpinner style={{width: '15px', height: '15px'}} strokeWidth="8" animationDuration=".5s" />
                        ) : (
                            <>
                            <div className="grid grid-cols-3 gap-4">
                                {sotckDT.map((piece => {
                                    let nomPiece = piece.nom_piece.toUpperCase()
                                    let quantite = piece.quantite
        
                                    return(
                                        <>
                                            <div className="rounded-2xl border-gray-400 bg-gray-100 px-4 pb-3 pt-4 dark:border-gray-800">
                                                <div>
                                                    <div className="flex items-center border-b pb-3 mb-3 justify-between">
                                                        <span className="text-sm">{nomPiece}</span>
                                                        <span><SimpleInfo /></span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-title-md">
                                                        <>
                                                            <span>{quantite}</span>
                                                        </>
                                                        <span className="text-gray-500"><MiniTools /></span>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )
                                }))}
                            </div>
                            </>                           
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}