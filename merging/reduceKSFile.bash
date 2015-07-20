# Root of project
BASE_DIR="$HOME/code/synteny-vis/merging/"

LENGTH_DIR="${BASE_DIR}/lengths/"
PY_DIR="${BASE_DIR}/simplify/"
PC_TO_TRI="${BASE_DIR}/main"

# These are the thresholds used by the reduction program
LEVELS="0 100000 200000 400000 800000 1600000 3200000 6400000 12800000 25600000"
HEADER="x1,y1,x2,y2,type"

INPUT_FILE_PATH=$1
if [[ -z "$INPUT_FILE_PATH" ]] ; then
    echo "Specify an input file"
    exit 1
fi

FILENAME=$(basename $INPUT_FILE_PATH)
IDS="${FILENAME%%\.*}"
X_ID=${IDS%_*}
Y_ID=${IDS#*_}
echo X-axis organism is $X_ID
echo Y-axis organism is $Y_ID

X_LENGTH_PATH="${LENGTH_DIR}/${X_ID}.json"
Y_LENGTH_PATH="${LENGTH_DIR}/${Y_ID}.json"

if ! [[ -f "${INPUT_FILE_PATH}" ]] ; then
    echo "Couldn't find ${INPUT_FILE_PATH}"
    exit 1
fi

if ! [[ -f "${X_LENGTH_PATH}" ]] ; then
    echo "Couldn't find ${X_LENGTH_PATH}"
    exit 1
fi

if ! [[ -f "${Y_LENGTH_PATH}" ]] ; then
    echo "Couldn't find ${Y_LENGTH_PATH}"
    exit 1
fi

SHORT_NAME="${X_ID}.${Y_ID}"

echo -n "Generating points and constraints from ks file... "
bash ./ksToCsv.bash "$INPUT_FILE_PATH" "$X_LENGTH_PATH" "$Y_LENGTH_PATH" > "${SHORT_NAME}.ks-csv"
# produces .csv.group files
python3 ${PY_DIR}/group_by_chrom.py < "${SHORT_NAME}.ks-csv"
T1=${SECONDS}
echo "done. (${SECONDS} seconds, ${SECONDS} total)"



echo -n "Generating conforming triangulations... "
for f in *.csv.group ; do
    bash ./csvToEdgeList.bash "$f" > "${f}.edgeList"
done

if which parallel > /dev/null ; then
    ls -S *.edgeList | parallel --eta "$PC_TO_TRI < {} | python3 ./simplify/native_to_edge_list.py > {.}.reduced"
else
    for f in $(ls -S *.edgeList | tac | head) ; do
        t=$SECONDS
        $PC_TO_TRI < "${f}" | python3 ./simplify/native_to_edge_list.py > "${f%.edgeList}.reduced"
        printf "%-20s %10s\n" "$(wc -l $f)" "$(( SECONDS - t))"
    done
fi
T2=$SECONDS
echo "done. ($((T2 - T1)) seconds, ${SECONDS} total)"


echo -n "Reducing triangulations at levels: $LEVELS ... "
if which parallel > /dev/null; then 
    ls -S *.reduced | parallel --eta "python3 ${PY_DIR}/simplifyTriangulation.py < {} --name {} $LEVELS"
else
    for f in *.reduced ; do
        python3 ${PY_DIR}/simplifyTriangulation.py < "$f" --name "$f" $LEVELS
    done
fi
T3=$SECONDS
echo "done. ($((T3 - T2)) seconds, ${SECONDS} total)"



echo -n "Cleaning up ... "

for level in $LEVELS ; do
    combined=${level}.combined.csv
    for f in *.${level}.csv ; do
        cat $f >> $combined
        mv $f ${f}.pieces
    done
done

mkdir -p intermediate_files
mv *.edgeList *.reduced *.group *.ks-csv *.pieces intermediate_files

rm -f web/data/*
mv *.combined.csv web/data
cd web/data
ls *.csv > ../fileList.txt
cd ../..
T4=$SECONDS
echo "done. ($((T4 - T3)) seconds, ${SECONDS} total)"
